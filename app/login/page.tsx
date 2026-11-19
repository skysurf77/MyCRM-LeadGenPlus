"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Accès réservé à l'équipe : il n'y a volontairement PAS d'inscription en self-service.
// La policy RLS `team_all` (0001_init.sql) donne à tout utilisateur authentifié un accès
// complet aux données de prospection — une inscription ouverte équivaudrait donc à
// publier le fichier de prospection. Les comptes sont créés à la main dans le dashboard
// Supabase, et « Allow new users to sign up » doit rester DÉSACTIVÉ côté Supabase :
// cette page ne fait que refléter ce choix, c'est Supabase qui l'applique.
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/companies");
      router.refresh();
    } catch (e: any) {
      setError(traduire(e?.message));
    } finally {
      setLoading(false);
    }
  }

  async function magicLink() {
    if (!email) {
      setError("Saisissez votre e-mail d'abord.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          // /!\ Par défaut, signInWithOtp CRÉE le compte s'il n'existe pas : ce lien
          //     magique serait alors une porte d'inscription ouverte. Jamais retirer.
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setMessage("Lien de connexion envoyé. Consultez votre boîte mail.");
    } catch (e: any) {
      setError(traduire(e?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-card">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Radar className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="font-semibold">MyCRM LeadGenPlus</div>
            <div className="text-xs text-muted-foreground">Leads avis Google</div>
          </div>
        </div>

        <h1 className="mb-1 text-sm font-semibold">Connexion</h1>
        <p className="mb-5 text-xs text-muted-foreground">
          Accès réservé à l&apos;équipe commerciale.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            type="email"
            required
            placeholder="vous@exemple.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={6}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : "Se connecter"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={magicLink} disabled={loading}>
          <Mail className="h-4 w-4" /> Recevoir un lien magique
        </Button>

        {message && (
          <p className="mt-4 rounded-md bg-green-50 p-2 text-sm text-green-700">{message}</p>
        )}
        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <p className="mt-5 border-t pt-4 text-[11px] text-muted-foreground">
          Pas encore de compte ? Les accès sont créés par l&apos;administrateur du CRM.
        </p>
      </div>
    </div>
  );
}

function traduire(msg?: string): string {
  if (!msg) return "Une erreur est survenue.";
  if (msg.includes("Invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (msg.includes("already registered")) return "Cet e-mail est déjà utilisé.";
  if (msg.includes("Email not confirmed")) return "E-mail non confirmé. Vérifiez votre boîte mail.";
  // Renvoyé par Supabase quand l'e-mail est inconnu et que shouldCreateUser vaut false.
  if (msg.includes("Signups not allowed") || msg.includes("signup_disabled")) {
    return "Aucun compte pour cet e-mail. Demandez un accès à l'administrateur du CRM.";
  }
  if (msg.includes("rate limit") || msg.includes("Too many requests")) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  return msg;
}
