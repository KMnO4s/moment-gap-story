import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, History, Trash2, Pencil, Check, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import manifest from "../../public/ext.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  addOccurrence, averageInterval, editOccurrence, emptyData, removeOccurrence, formatDate, formatDuration, parseNote, serializeNote, type TrackerData,
} from "@/lib/occurrences";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Compteur d'occurrences — éditeur Standard Notes" },
      { name: "description", content: "Notez chaque occurrence d'un évènement et suivez le temps écoulé et l'intervalle moyen." },
      { property: "og:title", content: "Compteur d'occurrences — éditeur Standard Notes" },
      { property: "og:description", content: "Notez chaque occurrence d'un évènement et suivez le temps écoulé et l'intervalle moyen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const DEMO_KEY = "occurrence-tracker-demo";

function Index() {
  const [data, setData] = useState<TrackerData>(emptyData);
  const [now, setNow] = useState(() => Date.now());
  const api = useRef<typeof import("sn-extension-api").default | null>(null);
  const lastSaved = useRef<string | null>(null);
  const [status, setStatus] = useState<"checking" | "connected" | "standalone">("checking");

  useEffect(() => {
    const w = window as any;
    if (window.parent === window) {
      setStatus("standalone");
      setData(parseNote(localStorage.getItem(DEMO_KEY)));
      return undefined;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    let stopTheme: (() => void) | undefined;
    import("sn-extension-api").then(({ default: sn }) => {
      if (cancelled) return;
      api.current = sn;
      sn.initialize({ debounceSave: 0 } as any);
      unsub = sn.subscribe((text: string) => {
        setStatus("connected");
        if (text === lastSaved.current) return;
        lastSaved.current = text;
        setData(parseNote(text));
      });
      stopTheme = watchDarkTheme();
      // Rejouer les messages reçus avant que l'éditeur soit prêt.
      const queued: unknown[] = w.__snQueue ?? [];
      if (w.__snListen) window.removeEventListener("message", w.__snListen);
      w.__snQueue = [];
      for (const d of queued) window.dispatchEvent(new MessageEvent("message", { data: d }));
    });
    return () => { cancelled = true; unsub?.(); stopTheme?.(); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const save = (next: TrackerData) => {
    setData(next);
    const text = serializeNote(next);
    if (status === "standalone") {
      localStorage.setItem(DEMO_KEY, text);
      return;
    }
    if (!api.current || status !== "connected") return;
    const last = next.occurrences.at(-1);
    lastSaved.current = text;
    api.current.text = text;
    api.current.preview = `${next.occurrences.length} occurrence(s)${last ? ` · dernière le ${formatDate(last)}` : ""}`;
  };

  const occ = data.occurrences;
  const last = occ.at(-1);
  const avg = averageInterval(occ);
  const add = () => save({ ...data, occurrences: addOccurrence(occ, new Date().toISOString()) });
  const [manual, setManual] = useState("");
  const [editing, setEditing] = useState<{ iso: string; value: string } | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 py-8 font-sans">
      <div className="flex items-start gap-3">
        <Textarea
          aria-label="Description"
          placeholder="Description"
          value={data.description}
          onChange={(e) => save({ ...data, description: e.target.value })}
          className="min-h-[60px] flex-1 resize-y"
        />
        <ConnectionIcon status={status} />
      </div>

      <section className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Depuis la dernière occurrence</p>
        <p className="mt-2 whitespace-nowrap font-mono text-3xl sm:text-4xl font-semibold text-primary">
          {last ? formatDuration(now - new Date(last).getTime()) : "—"}
        </p>
        <Button size="lg" onClick={add} className="mt-6 h-14 w-full text-lg">
          <Plus /> Nouvelle occurrence
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Occurrences" value={String(occ.length)} />
        <Stat label="Intervalle moyen" value={avg === null ? "—" : formatDuration(avg)} />
        <Stat label="Dernière" value={last ? formatDate(last) : "—"} />
      </section>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline"><History /> Voir l'historique</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historique</DialogTitle></DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); const iso = fromLocal(manual); if (iso) { save({ ...data, occurrences: addOccurrence(occ, iso) }); setManual(""); } }}
          >
            <Input type="datetime-local" aria-label="Date de l'occurrence" value={manual} onChange={(e) => setManual(e.target.value)} />
            <Button type="submit" disabled={!manual}><Plus /> Ajouter</Button>
          </form>
          <ol className="divide-y">
            {[...occ].reverse().map((o, i, arr) => {
              const prev = arr[i + 1];
              return (
                <li key={o} className="flex items-center justify-between gap-3 py-3">
                  {editing?.iso === o ? (
                    <form
                      className="flex flex-1 gap-2"
                      onSubmit={(e) => { e.preventDefault(); const iso = fromLocal(editing.value); if (iso) save({ ...data, occurrences: editOccurrence(occ, o, iso) }); setEditing(null); }}
                    >
                      <Input type="datetime-local" aria-label="Nouvelle date" value={editing.value} onChange={(e) => setEditing({ iso: o, value: e.target.value })} />
                      <Button type="submit" size="icon" aria-label="Valider"><Check /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Annuler" onClick={() => setEditing(null)}><X /></Button>
                    </form>
                  ) : (
                    <>
                      <div>
                        <p className="font-medium">#{occ.length - i} · {formatDate(o)}</p>
                        <p className="font-mono text-sm text-muted-foreground">
                          {prev ? `+ ${formatDuration(new Date(o).getTime() - new Date(prev).getTime())}` : "Première occurrence"}
                        </p>
                      </div>
                      <div className="flex">
                        <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => setEditing({ iso: o, value: toLocal(o) })}><Pencil /></Button>
                        <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setToDelete(o)}><Trash2 /></Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette occurrence ?</AlertDialogTitle>
            <AlertDialogDescription>{toDelete ? `Occurrence du ${formatDate(toDelete)}. Cette action est définitive.` : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (toDelete) save({ ...data, occurrences: removeOccurrence(occ, toDelete) }); setToDelete(null); }}
            >Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="mt-auto text-center text-xs text-muted-foreground">
        version {manifest.version}
      </footer>
    </main>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → valeur d'un champ datetime-local (heure locale). */
function toLocal(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocal(v: string): string | null {
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

const STATUS_LABEL = {
  connected: "Connecté à Standard Notes",
  standalone: "Mode autonome : rien n'est enregistré dans Standard Notes",
  checking: "Connexion à Standard Notes…",
} as const;

function ConnectionIcon({ status }: { status: keyof typeof STATUS_LABEL }) {
  return (
    <span title={STATUS_LABEL[status]} aria-label={STATUS_LABEL[status]} role="status" className="shrink-0">
      {status === "connected" ? <CheckCircle2 className="h-6 w-6 text-success" />
        : status === "standalone" ? <AlertTriangle className="h-6 w-6 text-warning" />
        : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
    </span>
  );
}

/** Bascule en sombre selon la couleur de fond du thème Standard Notes actif. */
function watchDarkTheme() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--sn-stylekit-background-color").trim();
    let dark = mq.matches;
    if (raw) {
      const probe = document.createElement("div");
      probe.style.color = raw;
      document.body.appendChild(probe);
      const n = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number);
      probe.remove();
      if (n && n.length >= 3) dark = (0.299 * n[0]! + 0.587 * n[1]! + 0.114 * n[2]!) / 255 < 0.5;
    }
    document.documentElement.classList.toggle("dark", dark);
  };
  sync();
  const timers = [200, 1000, 3000].map((t) => setTimeout(sync, t));
  const obs = new MutationObserver(() => setTimeout(sync, 50));
  obs.observe(document.head, { childList: true, subtree: true, attributes: true });
  document.addEventListener("load", sync, true);
  mq.addEventListener("change", sync);
  return () => { timers.forEach(clearTimeout); obs.disconnect(); document.removeEventListener("load", sync, true); mq.removeEventListener("change", sync); };
}
