export type TrackerData = { version: 1; description: string; occurrences: string[]; legacyText?: string };

export const emptyData = (): TrackerData => ({ version: 1, description: "", occurrences: [] });

const ISO_RE = /^-\s+(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/;
const DESC = "Description :";

const norm = (list: string[]) => [...new Set(list)].sort();

/** Texte lisible : "Description : …" puis une ligne "- ISO · date locale" par occurrence. */
export function serializeNote(d: TrackerData): string {
  const lines = [`${DESC} ${d.description}`.trimEnd(), ""];
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
          description: typeof d.description === "string" ? d.description : typeof d.title === "string" ? d.title : "",
          occurrences: norm(d.occurrences.filter((x: unknown) => typeof x === "string")),
          ...(d.legacyText ? { legacyText: d.legacyText } : {}),
        };
      }
    } catch { /* texte non JSON */ }
  }
  const isNew = t.startsWith(DESC);
  if (isNew || t.startsWith("# ")) {
    const lines = t.split("\n");
    const desc: string[] = [isNew ? lines[0]!.slice(DESC.length).trim() : lines[0]!.slice(2).trim()];
    const occurrences: string[] = [];
    let i = 1;
    for (; i < lines.length; i++) {
      const raw = lines[i]!;
      const l = raw.trim();
      if (l === "---") { i++; break; }
      const m = ISO_RE.exec(l);
      if (m && !Number.isNaN(Date.parse(m[1]!))) occurrences.push(m[1]!);
      else if (isNew && !occurrences.length) desc.push(raw);
    }
    const rest = lines.slice(i).join("\n").trim();
    return { version: 1, description: desc.join("\n").trim(), occurrences: norm(occurrences), ...(rest ? { legacyText: rest } : {}) };
  }
  return { ...emptyData(), legacyText: text };
}

export const addOccurrence = (list: string[], iso: string) => norm([...list, iso]);
export const editOccurrence = (list: string[], old: string, next: string) => norm([...list.filter((o) => o !== old), next]);
export const removeOccurrence = (list: string[], iso: string) => list.filter((o) => o !== iso);

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
