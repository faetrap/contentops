export interface ApiNote {
  id: string;
  relPath: string;
  frontmatter: Record<string, unknown> & {
    id: string;
    type: string;
    status: string;
    created: string;
    pillar?: string;
    summary?: string;
  };
  body: string;
  operators?: OperatorInfo[];
  /** Operator names this note may be wired into on the canvas. */
  feedable?: string[];
}

export interface OperatorInfo {
  name: string;
  label: string;
  description: string;
  accepts: string;
}

export interface Proposal {
  id: string;
  operatorName: string;
  sourceNoteIds: string[];
  payload: Record<string, unknown>;
  effectPreview: string;
}

export interface Health {
  vaultPath: string;
  vaultOk: boolean;
  claudeCli: string | null;
  model: string;
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export type Layout = Record<string, { x: number; y: number }>;

export interface Feed {
  noteId: string;
  operator: string;
}

export interface CanvasState {
  positions: Layout;
  feeds: Feed[];
}

export const api = {
  health: () => fetch("/api/health").then((r) => handle<Health>(r)),
  notes: (params: Record<string, string> = {}) =>
    fetch(`/api/notes?${new URLSearchParams(params)}`).then((r) => handle<ApiNote[]>(r)),
  operators: () => fetch("/api/operators").then((r) => handle<OperatorInfo[]>(r)),
  layout: () => fetch("/api/layout").then((r) => handle<CanvasState>(r)),
  saveLayout: (patch: { positions?: Layout; feeds?: Feed[] }) =>
    fetch("/api/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => handle<CanvasState>(r)),
  note: (id: string) => fetch(`/api/notes/${id}`).then((r) => handle<ApiNote>(r)),
  capture: (text: string, image: File | null) => {
    const form = new FormData();
    form.set("text", text);
    if (image) form.set("image", image);
    return fetch("/api/capture", { method: "POST", body: form }).then((r) => handle<ApiNote>(r));
  },
  runOperator: (name: string, noteIds: string[]) =>
    fetch(`/api/operators/${name}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteIds }),
    }).then((r) => handle<Proposal>(r)),
  approve: (proposalId: string, payload?: Record<string, unknown>) =>
    fetch(`/api/proposals/${proposalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload !== undefined ? { payload } : {}),
    }).then((r) => handle<{ effectSummary: string }>(r)),
  reject: (proposalId: string) =>
    fetch(`/api/proposals/${proposalId}/reject`, { method: "POST" }).then((r) => handle<{ ok: boolean }>(r)),
};

export function assetUrl(relEmbed: string): string {
  return `/api/assets/${encodeURIComponent(relEmbed.replace(/^assets\//, ""))}`;
}
