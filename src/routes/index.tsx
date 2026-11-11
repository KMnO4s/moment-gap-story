import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, History, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import manifest from "../../public/ext.json";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  averageInterval, emptyData, formatDate, formatDuration, parseNote, serializeNote, type TrackerData,
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
  const add = () => save({ ...data, occurrences: [...occ, new Date().toISOString()] });
  const remove = (iso: string) => save({ ...data, occurrences: occ.filter((o) => o !== iso) });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 py-8 font-sans">
      <div className="flex items-center gap-3">
      <input
        aria-label="Nom de l'évènement"
        value={data.title}
        onChange={(e) => save({ ...data, title: e.target.value })}
        className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none focus:border-b-2 focus:border-primary"
      />
        <ConnectionIcon status={status} />
      </div>

      <section className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Depuis la dernière occurrence</p>
        <p className="mt-2 font-mono text-4xl font-semibold text-primary">
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
          <Button variant="outline" disabled={!occ.length}><History /> Voir l'historique</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historique — {data.title}</DialogTitle></DialogHeader>
          <ol className="divide-y">
            {[...occ].reverse().map((o, i, arr) => {
              const prev = arr[i + 1];
              return (
                <li key={o} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">#{occ.length - i} · {formatDate(o)}</p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {prev ? `+ ${formatDuration(new Date(o).getTime() - new Date(prev).getTime())}` : "Première occurrence"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => remove(o)}>
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ol>
        </DialogContent>
      </Dialog>

      <footer className="mt-auto text-center text-xs text-muted-foreground">
        version {manifest.version}
      </footer>
    </main>
  );
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
