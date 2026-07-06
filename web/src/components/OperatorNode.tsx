import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { OperatorInfo } from "../api";

export interface OperatorNodeData {
  operator: OperatorInfo;
  feedCount: number;
  /** null = no wire being dragged; true/false = can this machine eat the dragged card. */
  eligible: boolean | null;
  running: boolean;
  anyRunning: boolean;
  onRun: (operatorName: string) => void;
  [key: string]: unknown;
}

const OP_ICON: Record<string, string> = {
  "input-classifier": "🗂",
  "idea-hook": "💡",
  "trend-translator": "🌀",
  "visual-direction": "🎨",
  "carousel-builder": "🃏",
};

/**
 * A permanent machine on the board. Feed it cards by dragging a wire from a
 * card's right edge into this node's left edge, then press Run.
 */
export function OperatorNode({ data }: NodeProps) {
  const { operator, feedCount, eligible, running, anyRunning, onRun } = data as OperatorNodeData;
  const eatClass = eligible === true ? " can-eat" : eligible === false ? " cant-eat" : "";
  return (
    <div className={`op-node${running ? " running" : ""}${eatClass}`}>
      <Handle type="target" position={Position.Left} className="op-handle" />
      <div className="op-head">
        <span className="op-icon">{OP_ICON[operator.name] ?? "⚙️"}</span>
        <span className="op-name">{operator.label}</span>
      </div>
      <div className="op-accepts">Feeds on: {operator.accepts}</div>
      <button
        className="op-run"
        disabled={anyRunning || feedCount === 0}
        title={feedCount === 0 ? "Wire a card into this operator first" : operator.description}
        onClick={() => onRun(operator.name)}
      >
        {running ? <span className="spinner" /> : "▶"} Run
        {feedCount > 0 && <span className="op-count">{feedCount} plugged in</span>}
      </button>
      <Handle type="source" position={Position.Right} className="op-handle" />
    </div>
  );
}
