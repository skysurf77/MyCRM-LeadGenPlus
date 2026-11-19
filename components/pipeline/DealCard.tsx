"use client";

import { MapPin, User, GripVertical } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { cn, formatEuros } from "@/lib/utils";
import { contactName, type DealWithRelations } from "@/lib/types";

export function DealCard({
  deal,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  deal: DealWithRelations;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const co = deal.companies;

  return (
    <article
      draggable
      onDragStart={(e) => {
        // `text/plain` est requis par Firefox pour amorcer le drag.
        e.dataTransfer.setData("text/plain", deal.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-lg border bg-background p-3 shadow-card transition-all hover:border-brand/40 hover:shadow-md",
        dragging && "opacity-40"
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {co?.name ?? deal.title}
        </h4>
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/30 transition-colors group-hover:text-muted-foreground active:cursor-grabbing" />
      </div>

      {co?.city && (
        <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {co.city}
            {co.category ? ` · ${co.category}` : ""}
          </span>
        </div>
      )}

      <div className="mb-2 flex items-center gap-1.5">
        {co && <TierBadge tier={co.lead_tier} score={co.lead_score} />}
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {deal.contacts ? contactName(deal.contacts) : "Aucun contact"}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">
          {deal.mrr !== null ? `${formatEuros(deal.mrr)}/mois` : "—"}
        </span>
      </div>
    </article>
  );
}
