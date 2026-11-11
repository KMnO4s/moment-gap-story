import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type ComponentRelay from "@standardnotes/component-relay";
import { Plus, History, Trash2 } from "lucide-react";
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
  const relay = useRef<ComponentRelay | null>(null);
  const item = useRef<any>(null);
  const embedded = useRef(false);
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    embedded.current = window.parent !== window;
    if (embedded.current) {
      let r: ComponentRelay | undefined;
      let cancelled = false;
      import("@standardnotes/component-relay").then(({ default: Relay }) => {
      if (cancelled) return;
      r = new Relay({ targetWindow: window, options: { coallesedSaving: false, acceptsThemes: true } });
      document.documentElement.classList.add("sn-embedded");
      relay.current = r;
      r.streamContextItem((note: any) => {
        const switched = item.current?.uuid !== note.uuid;
        item.current = note;
        if (note.isMetadataUpdate && !switched) return;
        const text = note.content?.text ?? "";
        if (!switched && text === lastSaved.current) return;
        lastSaved.current = text;
        setData(parseNote(text));
      });
      });
      return () => { cancelled = true; r?.deinit(); };
    }
    setData(parseNote(localStorage.getItem(DEMO_KEY)));
    return undefined;
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const save = (next: TrackerData) => {
    setData(next);
    const text = serializeNote(next);
    if (!embedded.current) {
      localStorage.setItem(DEMO_KEY, text);
      return;
    }
    const note = item.current;
    if (!note || !relay.current) return;
    const last = next.occurrences.at(-1);
    lastSaved.current = text;
    relay.current.saveItemWithPresave(note, () => {
      note.content.text = text;
      note.content.preview_plain = `${next.occurrences.length} occurrence(s)${last ? ` · dernière le ${formatDate(last)}` : ""}`;
    });
  };

  const occ = data.occurrences;
  const last = occ.at(-1);
  const avg = averageInterval(occ);
  const add = () => save({ ...data, occurrences: [...occ, new Date().toISOString()] });
  const remove = (iso: string) => save({ ...data, occurrences: occ.filter((o) => o !== iso) });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 py-8 font-sans">
      <input
        aria-label="Nom de l'évènement"
        value={data.title}
        onChange={(e) => save({ ...data, title: e.target.value })}
        className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none focus:border-b-2 focus:border-primary"
      />

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
