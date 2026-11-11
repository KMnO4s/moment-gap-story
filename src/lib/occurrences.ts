export type TrackerData = { version: 1; title: string; occurrences: string[]; legacyText?: string };

export const emptyData = (): TrackerData => ({ version: 1, title: "Mon évènement", occurrences: [] });

const ISO_RE = /^-\s+(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/;

/** Texte lisible stocké dans la note : "# Titre" puis une ligne "- ISO · date locale" par occurrence. */
export function serializeNote(d: TrackerData): string {
  const lines = [`# ${d.title}`, ""];
  for (const o of d.occurrences) lines.push(`- ${o} · ${formatDate(o)}`);
  if (d.legacyText) lines.push("", "---", d.legacyText);
  return lines.join("\n") + "\n";
}

export function parseNote(text: string | undefined | null): TrackerData {
  if (!text || !text.trim()) return emptyData();
  const t = text.trim();
  if (t.startsWith("{")) {
    try {
      const d = JSON.parse(t);
      if (d && Array.isArray(d.occurrences)) {
        return {
          version: 1,
          title: typeof d.title === "string" ? d.title : "Mon évènement",
          occurrences: d.occurrences.filter((x: unknown) => typeof x === "string").sort(),
          ...(d.legacyText ? { legacyText: d.legacyText } : {}),
        };
      }
    } catch {
      /* texte non JSON */
    }
  }
  if (t.startsWith("# ")) {
    const lines = t.split("\n");
    const title = lines[0]!.slice(2).trim() || "Mon évènement";
    const occurrences: string[] = [];
    let i = 1;
    for (; i < lines.length; i++) {
      const l = lines[i]!.trim();
      if (l === "---") { i++; break; }
      const m = ISO_RE.exec(l);
      if (m && !Number.isNaN(Date.parse(m[1]!))) occurrences.push(m[1]!);
    }
    const rest = lines.slice(i).join("\n").trim();
    return { version: 1, title, occurrences: occurrences.sort(), ...(rest ? { legacyText: rest } : {}) };
  }
  return { ...emptyData(), legacyText: text };
}

/** Intervalle moyen en ms entre occurrences, null si moins de 2. */
export function averageInterval(occ: string[]): number | null {
  if (occ.length < 2) return null;
  const t = occ.map((o) => new Date(o).getTime()).sort((a, b) => a - b);
  return (t[t.length - 1]! - t[0]!) / (t.length - 1);
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} j ${h} h ${m} min`;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${s % 60} s`;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
