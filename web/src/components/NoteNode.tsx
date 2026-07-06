import { Handle, Position, type NodeProps } from "@xyflow/react";
import { assetUrl, type ApiNote, type OperatorInfo } from "../api";

export interface NoteNodeData {
  note: ApiNote;
  running: string | null;
  onRun: (operator: string, noteId: string) => void;
  onOpen: (noteId: string) => void;
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
};

export function NoteNode({ data }: NodeProps) {
  const { note, running, onRun, onOpen } = data as NoteNodeData;
  const fm = note.frontmatter;
  const image = note.body.match(/!\[\[([^\]]+\.(?:png|jpe?g|webp|gif))\]\]/i)?.[1];
  const firstProse = note.body
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#") && !l.startsWith("- [["));
  const title = (fm.summary as string) || firstProse || "(image)";
  const ops: OperatorInfo[] = note.operators ?? [];

  return (
    <div className={`node node-${fm.status}`} onDoubleClick={() => onOpen(note.id)}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="node-head">
        <span className="node-icon">{TYPE_ICON[fm.type] ?? "•"}</span>
        <span className="node-type">{fm.type.replaceAll("_", " ")}</span>
        <span className={`badge ${fm.status}`}>{fm.status}</span>
      </div>
      {image && <img className="node-thumb" src={assetUrl(image)} alt="" />}
      <div className="node-title">{title.slice(0, 140)}</div>
      {ops.length > 0 && (
        <div className="node-ops">
          {ops.map((op) => (
            <button
              key={op.name}
              className="node-op"
              disabled={running !== null}
              title={op.description}
              onClick={(e) => {
                e.stopPropagation();
                onRun(op.name, note.id);
              }}
            >
              {running === op.name ? <span className="spinner dark" /> : "⚡"} {op.label}
            </button>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}
