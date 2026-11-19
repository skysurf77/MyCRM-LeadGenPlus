"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload, FileDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  batchName?: string;
}

export function ImportModal({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setBatchName("");
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const content = await file.text();
      const format = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          content,
          batchName: batchName.trim() || file.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de l'import.");
      } else {
        setResult(data as ImportResult);
        onImported();
      }
    } catch (e: any) {
      setError(e?.message ?? "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-foreground/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 animate-fade-in rounded-xl border bg-background p-6 shadow-drawer focus:outline-none">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Importer des leads
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Fichier CSV ou JSON issu de votre scraping Google Maps. La
                déduplication se fait sur le <code>place_id</code>.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          {/* Modèles téléchargeables */}
          <div className="mb-4 rounded-lg border bg-surface p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Pas sûr du format ? Téléchargez un modèle :
            </div>
            <div className="flex gap-2">
              <a href="/templates/leads_template.csv" download>
                <Button variant="outline" size="sm">
                  <FileDown className="h-3.5 w-3.5" /> Modèle CSV
                </Button>
              </a>
              <a href="/templates/leads_template.json" download>
                <Button variant="outline" size="sm">
                  <FileDown className="h-3.5 w-3.5" /> Modèle JSON
                </Button>
              </a>
            </div>
          </div>

          {!result ? (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Nom de la campagne (optionnel)
                </span>
                <Input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Ex : Restaurants Lyon — Nov 2026"
                />
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand/50 hover:bg-brand-soft/30">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm">
                  {file ? (
                    <strong>{file.name}</strong>
                  ) : (
                    "Cliquez pour choisir un fichier .csv ou .json"
                  )}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.json,application/json,text/csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="ghost">Annuler</Button>
                </Dialog.Close>
                <Button onClick={submit} disabled={!file || loading}>
                  {loading ? "Import en cours…" : "Importer"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                Import terminé — campagne «&nbsp;{result.batchName}&nbsp;».
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <ResultStat label="Ajoutés" value={result.inserted} tone="green" />
                <ResultStat label="Mis à jour" value={result.updated} tone="blue" />
                <ResultStat label="Ignorés" value={result.skipped} tone="gray" />
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <div className="mb-1 font-medium">
                    {result.errors.length} ligne(s) ignorée(s) :
                  </div>
                  <ul className="list-inside list-disc space-y-0.5">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>
                  Importer un autre fichier
                </Button>
                <Dialog.Close asChild>
                  <Button>Terminer</Button>
                </Dialog.Close>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ResultStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "blue" | "gray";
}) {
  const tones = {
    green: "text-green-700",
    blue: "text-brand",
    gray: "text-muted-foreground",
  };
  return (
    <div className="rounded-lg border bg-surface p-3">
      <div className={`text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
