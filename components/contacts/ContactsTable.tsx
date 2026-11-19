"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { ArrowUpDown, Mail, Phone, Linkedin, Sparkles } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import {
  contactName,
  ENRICHMENT_LABELS,
  type ContactWithCompany,
  type EnrichmentStatus,
} from "@/lib/types";

const ENRICHMENT_OPTIONS = Object.keys(ENRICHMENT_LABELS) as EnrichmentStatus[];

export function ContactsTable({
  data,
  onRowClick,
  onInlineUpdate,
}: {
  data: ContactWithCompany[];
  onRowClick: (c: ContactWithCompany) => void;
  onInlineUpdate: (id: string, patch: Partial<ContactWithCompany>) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "company", desc: false }]);

  const columns = useMemo<ColumnDef<ContactWithCompany>[]>(
    () => [
      {
        id: "name",
        header: "Contact",
        accessorFn: (r) => contactName(r),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium">{contactName(row.original)}</span>
              {row.original.is_decision_maker && (
                <span
                  title="Décideur"
                  className="rounded bg-brand-soft px-1 text-[10px] font-semibold text-brand"
                >
                  DÉCIDEUR
                </span>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.title ?? "—"}
            </div>
          </div>
        ),
      },
      {
        id: "company",
        header: "Entreprise",
        accessorFn: (r) => r.companies?.name ?? "",
        cell: ({ row }) => {
          const co = row.original.companies;
          return (
            <div className="min-w-0">
              <div className="truncate text-sm">{co?.name ?? "—"}</div>
              <div className="truncate text-xs text-muted-foreground">
                {co?.city ?? "—"}
              </div>
            </div>
          );
        },
      },
      {
        id: "tier",
        header: "Score",
        accessorFn: (r) => r.companies?.lead_score ?? -1,
        cell: ({ row }) => {
          const co = row.original.companies;
          return co ? <TierBadge tier={co.lead_tier} score={co.lead_score} /> : "—";
        },
      },
      {
        id: "channels",
        header: "Coordonnées",
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-2">
              <ChannelIcon
                href={c.email ? `mailto:${c.email}` : null}
                title={c.email}
                icon={<Mail className="h-4 w-4" />}
              />
              <ChannelIcon
                href={c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : null}
                title={c.phone}
                icon={<Phone className="h-4 w-4" />}
              />
              <ChannelIcon
                href={c.linkedin_url}
                title={c.linkedin_url}
                icon={<Linkedin className="h-4 w-4" />}
                external
              />
            </div>
          );
        },
      },
      {
        id: "icebreaker",
        header: "Accroche IA",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.ai_icebreaker ? (
            <span
              title={row.original.ai_icebreaker}
              className="flex items-start gap-1 text-xs text-muted-foreground"
            >
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
              <span className="line-clamp-2">{row.original.ai_icebreaker}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">—</span>
          ),
      },
      {
        accessorKey: "enrichment_status",
        header: "Enrichissement",
        enableSorting: false,
        cell: ({ row }) => (
          <select
            value={row.original.enrichment_status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              onInlineUpdate(row.original.id, {
                enrichment_status: e.target.value as EnrichmentStatus,
              })
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {ENRICHMENT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ENRICHMENT_LABELS[s]}
              </option>
            ))}
          </select>
        ),
      },
    ],
    [onInlineUpdate]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b">
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className="cursor-pointer border-b transition-colors hover:bg-brand-soft/40"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="max-w-[260px] px-4 py-2.5 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChannelIcon({
  href,
  title,
  icon,
  external,
}: {
  href: string | null | undefined;
  title: string | null | undefined;
  icon: React.ReactNode;
  external?: boolean;
}) {
  if (!href) {
    return <span className="text-muted-foreground/25">{icon}</span>;
  }
  return (
    <a
      href={href}
      title={title ?? undefined}
      onClick={(e) => e.stopPropagation()}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="text-muted-foreground transition-colors hover:text-brand"
    >
      {icon}
    </a>
  );
}
