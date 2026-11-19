import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Le middleware protège déjà ces routes ; garde-fou supplémentaire.
  if (!user) redirect("/login");

  return (
    <Providers>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar email={user.email ?? null} />
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
