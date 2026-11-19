"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const TITLES: Record<string, string> = {
  "/companies": "Entreprises",
  "/contacts": "Contacts",
  "/pipeline": "Pipeline",
  "/tasks": "Tâches",
  "/analytics": "Analytics",
};

export function Topbar({ email }: { email: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  const title =
    Object.entries(TITLES).find(([href]) => pathname.startsWith(href))?.[1] ??
    "MyCRM LeadGenPlus";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (email ?? "?").slice(0, 2).toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-6">
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
            {initials}
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email ?? "Invité"}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Se déconnecter">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
