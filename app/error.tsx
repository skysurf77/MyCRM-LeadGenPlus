"use client";

// Frontière d'erreur de l'App Router. Sans ce fichier, une erreur de rendu
// remonte au message interne « missing required error components » qui ne dit
// rien d'exploitable. Ici on affiche de quoi diagnostiquer.

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En développement, la pile complète reste disponible dans la console.
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tier-d/15 text-tier-d">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold">Une erreur est survenue</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La page n&apos;a pas pu s&apos;afficher. Réessayez : si le problème
          persiste, le détail est dans la console du navigateur et dans le
          terminal du serveur.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-3 overflow-x-auto rounded-md border bg-surface p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground">
            Référence : <code>{error.digest}</code>
          </p>
        )}
      </div>
      <Button onClick={reset}>
        <RotateCcw className="h-4 w-4" /> Réessayer
      </Button>
    </div>
  );
}
