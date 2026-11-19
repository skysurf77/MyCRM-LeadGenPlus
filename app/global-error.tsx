"use client";

// Filet de sécurité ultime : capture les erreurs du layout racine lui-même.
// Il remplace tout le document, donc il embarque ses propres <html>/<body>
// et ne peut pas dépendre du thème (la feuille de style peut être la cause).

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          color: "#1f2937",
          background: "#ffffff",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", margin: 0 }}>
          L&apos;application n&apos;a pas pu démarrer
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280", maxWidth: "32rem" }}>
          Si l&apos;erreur persiste après rechargement, arrêtez le serveur,
          supprimez le dossier <code>.next</code> et relancez <code>npm run dev</code>.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Référence : <code>{error.digest}</code>
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "#ff7657",
            color: "#ffffff",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
