import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ApiNote, type Feed, type Layout, type OperatorInfo } from "../api";
import { CaptureBar } from "./CaptureBar";
import { NoteNode } from "./NoteNode";
import { OperatorNode } from "./OperatorNode";

const nodeTypes = { note: NoteNode, operator: OperatorNode };

/** Board geography: inputs left, operators middle, outputs right. */
const NOTE_X: Record<string, number> = { raw: 40, processed: 340 };
const OUTPUT_X: Record<string, number> = { idea: 1080, draft: 1420 };
const OP_X = 700;

const OUTPUT_TYPES = new Set(["idea", "design_brief", "carousel_draft", "reel_draft", "caption_draft"]);

interface Props {
  notes: ApiNote[];
  runningOp: string | null;
  onRun: (operator: string, noteIds: string[]) => void;
  onOpen: (noteId: string) => void;
  onEdit: (noteId: string) => void;
  onArchive: (noteId: string) => void;
  onCaptured: () => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}

export function Canvas({ notes: allNotes, runningOp, onRun, onOpen, onEdit, onArchive, onCaptured, onError, onInfo }: Props) {
  // Archived notes leave the board; they stay findable in the List tab.
  const notes = allNotes.filter((n) => n.frontmatter.status !== "archived");
  const positions = useRef<Layout>({});
  const feedsRef = useRef<Feed[]>([]);
  const [operators, setOperators] = useState<OperatorInfo[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [ready, setReady] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0);
  const flowRef = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const framedRef = useRef(false);
  /** While a wire is being dragged from a card, machines show can-eat/can't-eat. */
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);

  // Callbacks live in a ref so node rebuilds never depend on their identity —
  // unstable callback props were wiping React Flow's node measurements every
  // render, leaving every node permanently `visibility: hidden`.
  const cbRef = useRef({ onRun, onOpen, onEdit, onArchive });
  cbRef.current = { onRun, onOpen, onEdit, onArchive };

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const load = () =>
      Promise.all([api.layout(), api.operators()])
        .then(([state, ops]) => {
          if (!alive) return;
          positions.current = state.positions;
          feedsRef.current = state.feeds;
          setOperators(ops);
          setReady(true);
        })
        .catch(() => {
          // Server may be mid-restart — keep trying until the machines appear.
          if (alive) timer = window.setTimeout(load, 2500);
        });
    load();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistFeeds = useCallback((feeds: Feed[]) => {
    feedsRef.current = feeds;
    setFeedVersion((v) => v + 1);
    api.saveLayout({ feeds }).catch(() => {});
  }, []);

  const rebuild = useCallback(() => {
    // Drop feed wires whose note vanished or no longer fits the operator
    // (e.g. a raw card that got classified out of the classifier's diet).
    const byId = new Map(notes.map((n) => [n.id, n]));
    const validFeeds = feedsRef.current.filter((f) => byId.get(f.noteId)?.feedable?.includes(f.operator));
    if (validFeeds.length !== feedsRef.current.length) persistFeeds(validFeeds);

    // ── Note cards ──
    const colY: Record<string, number> = {};
    const noteNodes: Node[] = notes.map((note) => {
      let pos = positions.current[note.id];
      if (!pos) {
        const isOutput = OUTPUT_TYPES.has(note.frontmatter.type);
        const x = isOutput
          ? OUTPUT_X[note.frontmatter.status] ?? OUTPUT_X.idea
          : NOTE_X[note.frontmatter.status] ?? NOTE_X.processed;
        const y = colY[x] ?? 60;
        const hasImage = /!\[\[[^\]]+\.(?:png|jpe?g|webp|gif)\]\]/i.test(note.body);
        colY[x] = y + (hasImage ? 400 : 165);
        pos = { x, y };
        positions.current[note.id] = pos;
      }
      return {
        id: note.id,
        type: "note",
        position: pos,
        data: {
          note,
          onOpen: (id: string) => cbRef.current.onOpen(id),
          onEdit: (id: string) => cbRef.current.onEdit(id),
          onArchive: (id: string) => cbRef.current.onArchive(id),
        },
      };
    });

    // ── Operator machines ──
    const opNodes: Node[] = operators.map((op, i) => {
      const id = `op:${op.name}`;
      let pos = positions.current[id];
      if (!pos) {
        pos = { x: OP_X, y: 60 + i * 175 };
        positions.current[id] = pos;
      }
      const feedCount = validFeeds.filter((f) => f.operator === op.name).length;
      const dragNote = dragNoteId ? notes.find((n) => n.id === dragNoteId) : null;
      return {
        id,
        type: "operator",
        position: pos,
        data: {
          operator: op,
          feedCount,
          eligible: dragNote ? (dragNote.feedable?.includes(op.name) ?? false) : null,
          running: runningOp === op.name,
          anyRunning: runningOp !== null,
          onRun: (name: string) => {
            const noteIds = feedsRef.current.filter((f) => f.operator === name).map((f) => f.noteId);
            cbRef.current.onRun(name, noteIds);
          },
        },
      };
    });

    // ── Wires ──
    const built: Edge[] = [];
    // 1. Feed wires the user plugged in (brass, solid, click to unplug)
    for (const f of validFeeds) {
      built.push({
        id: `feed:${f.noteId}:${f.operator}`,
        source: f.noteId,
        target: `op:${f.operator}`,
        style: { stroke: "#a5432e", strokeWidth: 2 },
      });
    }
    // 2. Product wires: operator → the output it produced (violet)
    const byBasename = new Map(notes.map((n) => [n.relPath.split("/").pop()!.replace(/\.md$/, ""), n.id]));
    for (const n of notes) {
      const src = String(n.frontmatter.source ?? "");
      if (src.endsWith(" operator")) {
        const opName = src.replace(" operator", "");
        if (operators.some((o) => o.name === opName)) {
          built.push({
            id: `prod:${n.id}`,
            source: `op:${opName}`,
            target: n.id,
            animated: true,
            style: { stroke: "#3f5f8a", strokeWidth: 2 },
          });
        }
      }
      // 3. Lineage wires: source note ⇢ output (pale, dashed — provenance)
      for (const link of (n.frontmatter.links as string[] | undefined) ?? []) {
        const base = String(link).replace(/^\[\[/, "").replace(/\]\]$/, "");
        const sourceId = byBasename.get(base);
        if (sourceId && sourceId !== n.id) {
          built.push({
            id: `lin:${sourceId}->${n.id}`,
            source: sourceId,
            target: n.id,
            style: { stroke: "#d8c39d", strokeWidth: 1.2, strokeDasharray: "4 5" },
          });
        }
      }
    }

    // Merge into existing nodes instead of replacing them — replacement threw
    // away React Flow's measured dimensions, so nodes never left their initial
    // `visibility: hidden` state.
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return [...noteNodes, ...opNodes].map((fresh) => {
        const old = prevById.get(fresh.id);
        return old ? { ...old, data: fresh.data, type: fresh.type } : fresh;
      });
    });
    setEdges(built);

    // Frame the cards once, the first time real content lands.
    if (!framedRef.current && (notes.length > 0 || operators.length > 0)) {
      framedRef.current = true;
      requestAnimationFrame(() => {
        flowRef.current?.fitView({ padding: 0.25, maxZoom: 0.95 });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, operators, runningOp, feedVersion, dragNoteId, persistFeeds]);

  useEffect(() => {
    if (ready) rebuild();
  }, [ready, rebuild]);

  /** Drag a wire from a card into an operator = plug it in. */
  const onConnect = useCallback(
    (conn: Connection) => {
      const opName = conn.target?.startsWith("op:") ? conn.target.slice(3) : null;
      if (!opName || conn.source?.startsWith("op:")) {
        onError("Wires go from a card into an operator (left edge).");
        return;
      }
      const note = notes.find((n) => n.id === conn.source);
      const op = operators.find((o) => o.name === opName);
      if (!note || !op) return;
      if (!note.feedable?.includes(opName)) {
        onError(`"${op.label}" doesn't eat this kind of card. ${op.hint}`);
        return;
      }
      if (feedsRef.current.some((f) => f.noteId === note.id && f.operator === opName)) return;
      persistFeeds([...feedsRef.current, { noteId: note.id, operator: opName }]);
      onInfo(`Plugged into ${op.label} — press Run on it when ready.`);
    },
    [notes, operators, onError, onInfo, persistFeeds]
  );

  /** Click a brass wire to unplug it. */
  const onEdgeClick = useCallback(
    (_: unknown, edge: Edge) => {
      if (!edge.id.startsWith("feed:")) return;
      persistFeeds(
        feedsRef.current.filter((f) => `feed:${f.noteId}:${f.operator}` !== edge.id)
      );
      onInfo("Unplugged.");
    },
    [persistFeeds, onInfo]
  );

  const saveTimer = useRef<number | null>(null);
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
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
          api.saveLayout({ positions: positions.current }).catch(() => {});
        }, 600);
      }
    },
    [onNodesChange]
  );

  return (
    <div className="canvas-wrap">
      <CaptureBar onCaptured={onCaptured} onError={onError} />
      <div className="canvas-legend">
        <span><i className="dot dot-input" /> Inspiration</span>
        <span><i className="dot dot-op" /> Operator</span>
        <span><i className="dot dot-output" /> Output</span>
        <span className="legend-wires">
          <i className="wire wire-feed" /> Plugged in · <i className="wire wire-prod" /> Made by ·{" "}
          <i className="wire wire-lin" /> Came from
        </span>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(instance) => {
          flowRef.current = instance;
          if (framedRef.current) instance.fitView({ padding: 0.25, maxZoom: 0.95 });
        }}
        onNodesChange={handleNodesChange}
        onConnect={onConnect}
        onConnectStart={(_, params) => {
          if (params.nodeId && !params.nodeId.startsWith("op:")) setDragNoteId(params.nodeId);
        }}
        onConnectEnd={() => setDragNoteId(null)}
        onEdgeClick={onEdgeClick}
        onNodeClick={(_, node) => {
          if (node.type === "note") cbRef.current.onOpen(node.id);
        }}
        nodeTypes={nodeTypes}
        minZoom={0.15}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1.2} color="#e9dcbc" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
