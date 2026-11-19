"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/useFilters";
import { filtersToParams } from "@/lib/filters";

const NAV = [
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "Tâches", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  // Les filtres actifs suivent l'utilisateur d'un onglet à l'autre.
  const filters = useFilters();
  const qs = filtersToParams(filters.snapshot()).toString();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-surface">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Radar className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">MyCRM</div>
          <div className="text-[11px] text-muted-foreground">LeadGenPlus</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={qs ? `${item.href}?${qs}` : item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-soft text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3 text-[11px] text-muted-foreground">
        CRM complet · 5 onglets
      </div>
    </aside>
  );
}
