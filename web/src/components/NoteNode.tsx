import { Handle, Position, type NodeProps } from "@xyflow/react";
import { assetUrl, type ApiNote } from "../api";

export interface NoteNodeData {
  note: ApiNote;
  onOpen: (noteId: string) => void;
  onEdit: (noteId: string) => void;
  onArchive: (noteId: string) => void;
  [key: string]: unknown;
}

const TYPE_ICON: Record<string, string> = {
  unclassified: "•",
  hook: "✎",
  trend: "📈",
  visual_reference: "🖼",
  yoga_note: "🧘",
  personal_reflection: "🌙",
  tarot_chakra_philosophy: "🔮",
  idea: "💡",
  design_brief: "🎨",
  carousel_draft: "🃏",
};

/** Output types are products of operators — tinted violet on the board. */
const OUTPUT_TYPES = new Set(["idea", "design_brief", "carousel_draft", "reel_draft", "caption_draft"]);

const pretty = (s: string) => {
  const t = s.replaceAll("_", " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function NoteNode({ data }: NodeProps) {
  const { note, onOpen, onEdit, onArchive } = data as NoteNodeData;
  const fm = note.frontmatter;
  const image = note.body.match(/!\[\[([^\]]+\.(?:png|jpe?g|webp|gif))\]\]/i)?.[1];
  const firstProse = note.body
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith("- [["));
  const title = (fm.summary as string) || firstProse || "(image)";
  const isOutput = OUTPUT_TYPES.has(fm.type);

  return (
    <div
      className={`node ${isOutput ? "node-output" : "node-input"} node-${fm.status}`}
      onDoubleClick={() => onOpen(note.id)}
      title="Click to open & edit · drag from the right edge into an operator to feed it"
    >
      <div className="node-head">
        <span className="node-icon">{TYPE_ICON[fm.type] ?? "•"}</span>
        <span className="node-type">{pretty(fm.type)}</span>
        <span className={`badge ${fm.status}`}>{pretty(fm.status)}</span>
        <button
          className="node-act"
          title="Edit this note"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(note.id);
          }}
        >
          ✏️
        </button>
        <button
          className="node-act"
          title="Bin — removes it from the board (kept in List → Archived)"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(note.id);
          }}
        >
          🗑
        </button>
      </div>
      {image && <img className="node-thumb" src={assetUrl(image)} alt="" />}
      <div className="node-title">{title.slice(0, 140)}</div>
      <Handle type="source" position={Position.Right} className="node-handle" />
      <Handle type="target" position={Position.Left} className="node-handle node-handle-in" />
    </div>
  );
}
