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
import { ArrowUpDown, Star, Globe } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { formatNumber, formatRating } from "@/lib/utils";
import { LIFECYCLE_LABELS, type Company, type LifecycleStatus } from "@/lib/types";

const LIFECYCLE_OPTIONS = Object.keys(LIFECYCLE_LABELS) as LifecycleStatus[];

export function CompaniesTable({
  data,
  onRowClick,
  onInlineUpdate,
}: {
  data: Company[];
  onRowClick: (c: Company) => void;
  onInlineUpdate: (id: string, patch: Partial<Company>) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "lead_score", desc: true }]);

  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Entreprise",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.original.city ?? "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Catégorie",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {(getValue() as string) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "rating",
        header: "Note",
        cell: ({ getValue }) => (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star className="h-3.5 w-3.5 text-tier-b" />
            {formatRating(getValue() as number | null)}
          </span>
        ),
      },
      {
        accessorKey: "reviews_count",
        header: "Avis",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatNumber(getValue() as number | null)}</span>
        ),
      },
      {
        accessorKey: "lead_score",
        header: "Score",
        cell: ({ row }) => (
          <TierBadge tier={row.original.lead_tier} score={row.original.lead_score} />
        ),
      },
      {
        accessorKey: "lifecycle_status",
        header: "Statut",
        enableSorting: false,
        cell: ({ row }) => (
          <select
            value={row.original.lifecycle_status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              onInlineUpdate(row.original.id, {
                lifecycle_status: e.target.value as LifecycleStatus,
              })
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {LIFECYCLE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {LIFECYCLE_LABELS[s]}
              </option>
            ))}
          </select>
        ),
      },
      {
        id: "batch",
        header: "Campagne",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.scrape_batches?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "web",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.website ? (
            <a
              href={row.original.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-brand"
              title="Ouvrir le site"
            >
              <Globe className="h-4 w-4" />
            </a>
          ) : null,
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
                <td key={cell.id} className="max-w-[220px] px-4 py-2.5">
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
