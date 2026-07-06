import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type ApiNote, type Layout } from "../api";
import { CaptureBar } from "./CaptureBar";
import { NoteNode, type NoteNodeData } from "./NoteNode";

const nodeTypes = { note: NoteNode };

const COLUMN: Record<string, number> = { raw: 0, processed: 1, idea: 2, draft: 3 };

interface Props {
  notes: ApiNote[];
  runningOp: string | null;
  onRun: (operator: string, noteId: string) => void;
  onOpen: (noteId: string) => void;
  onCaptured: () => void;
  onError: (message: string) => void;
}

/** Derive lineage edges from each note's [[wikilinks]] back to its sources. */
function buildEdges(notes: ApiNote[]): Edge[] {
  const byBasename = new Map<string, string>();
  for (const n of notes) {
    const base = n.relPath.split("/").pop()!.replace(/\.md$/, "");
    byBasename.set(base, n.id);
  }
  const edges: Edge[] = [];
  for (const n of notes) {
    const links = (n.frontmatter.links as string[] | undefined) ?? [];
    for (const link of links) {
      const base = String(link).replace(/^\[\[/, "").replace(/\]\]$/, "");
      const sourceId = byBasename.get(base);
      if (sourceId && sourceId !== n.id) {
        edges.push({
          id: `${sourceId}->${n.id}`,
          source: sourceId,
          target: n.id,
          animated: true,
          style: { stroke: "#c9b79a", strokeWidth: 1.5, strokeDasharray: "5 5" },
        });
      }
    }
  }
  return edges;
}

export function Canvas({ notes, runningOp, onRun, onOpen, onCaptured, onError }: Props) {
  const positions = useRef<Layout>({});
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NoteNodeData>>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    api
      .layout()
      .then((l) => (positions.current = l))
      .catch(() => (positions.current = {}))
      .finally(() => setLayoutReady(true));
  }, []);

  const rebuild = useCallback(() => {
    const colY: Record<number, number> = {};
    const built: Node<NoteNodeData>[] = notes.map((note) => {
      let pos = positions.current[note.id];
      if (!pos) {
        const col = COLUMN[note.frontmatter.status] ?? 4;
        const y = colY[col] ?? 60;
        pos = { x: 60 + col * 360, y };
        // Reserve more vertical room for image cards so nothing overlaps on first load.
        const hasImage = /!\[\[[^\]]+\.(?:png|jpe?g|webp|gif)\]\]/i.test(note.body);
        colY[col] = y + (hasImage ? 410 : 175);
        positions.current[note.id] = pos;
      }
      return {
        id: note.id,
        type: "note",
        position: pos,
        data: { note, running: runningOp, onRun, onOpen },
      };
    });
    setNodes(built);
    setEdges(buildEdges(notes));
  }, [notes, runningOp, onRun, onOpen, setNodes, setEdges]);

  useEffect(() => {
    if (layoutReady) rebuild();
  }, [layoutReady, rebuild]);

  // Persist positions shortly after a drag settles.
  const saveTimer = useRef<number | null>(null);
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<NoteNodeData>>[]) => {
      onNodesChange(changes);
      let moved = false;
      for (const c of changes) {
        if (c.type === "position" && c.position) {
          positions.current[c.id] = c.position;
          moved = true;
        }
      }
      if (moved) {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          api.saveLayout(positions.current).catch(() => {});
        }, 600);
      }
    },
    [onNodesChange]
  );

  const emptyHint = useMemo(() => notes.length === 0, [notes.length]);

  return (
    <div className="canvas-wrap">
      <CaptureBar onCaptured={onCaptured} onError={onError} />
      {emptyHint && (
        <div className="canvas-empty">
          Your board is empty. Capture a thought or a screenshot above — it lands here as a card you
          can run operators on.
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#e2d8c8" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
