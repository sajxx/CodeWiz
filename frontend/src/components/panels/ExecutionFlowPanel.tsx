import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import dagre from 'dagre';
import { useAnalysisStore } from '@/store/analysisStore';
import type { FlowStepType } from '@shared/types';

/* ── colour palette per step type ── */
const stepColors: Record<FlowStepType, string> = {
  entry:    '#22C55E',
  exit:     '#EF4444',
  service:  '#3B82F6',
  decision: '#F59E0B',
  database: '#8B5CF6',
};

/* ── Custom node: diamond for decision ── */
function DecisionNode({ data }: NodeProps) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 90, height: 90 }}>
      {/* Diamond shape */}
      <div
        style={{
          position: 'absolute',
          width: 70,
          height: 70,
          backgroundColor: stepColors.decision,
          borderRadius: 8,
          transform: 'rotate(45deg)',
        }}
      />
      {/* Text stays upright */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          textAlign: 'center',
          maxWidth: 80,
          lineHeight: '1.3',
        }}
      >
        {data.label as string}
      </span>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

/* ── Custom node: pill for entry / exit ── */
function PillNode({ data }: NodeProps) {
  const bg = (data.stepType as string) === 'exit' ? stepColors.exit : stepColors.entry;
  return (
    <div
      style={{
        backgroundColor: bg,
        color: '#fff',
        borderRadius: 9999,
        padding: '8px 28px',
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
        minWidth: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {data.label as string}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

/* ── Custom node: rectangle for service / database ── */
function RectNode({ data }: NodeProps) {
  const bg = (data.stepType as string) === 'database' ? stepColors.database : stepColors.service;
  return (
    <div
      style={{
        backgroundColor: bg,
        color: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
        minWidth: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {data.label as string}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = {
  decision: DecisionNode,
  pill: PillNode,
  rect: RectNode,
};

/* ── Dagre layout ── */
function layoutFlow(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

  nodes.forEach((n) => {
    const isDecision = n.type === 'decision';
    g.setNode(n.id, { width: isDecision ? 100 : 220, height: isDecision ? 100 : 50 });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const isDecision = n.type === 'decision';
    const w = isDecision ? 100 : 220;
    const h = isDecision ? 100 : 50;
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });
}

export default function ExecutionFlowPanel() {
  const result = useAnalysisStore((s) => s.result);
  const [activeFlowIdx, setActiveFlowIdx] = useState(0);

  /* Build nodes & edges from the selected flow */
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!result || !result.executionFlows.length)
      return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };

    const flow = result.executionFlows[activeFlowIdx];

    const rfNodes: Node[] = flow.steps.map((step) => {
      const isDecision = step.type === 'decision';
      const isPill = step.type === 'entry' || step.type === 'exit';
      return {
        id: step.id,
        type: isDecision ? 'decision' : isPill ? 'pill' : 'rect',
        data: { label: step.label, stepType: step.type },
        position: { x: 0, y: 0 },
      };
    });

    const rfEdges: Edge[] = flow.steps.slice(0, -1).map((step, i) => ({
      id: `flow-edge-${i}`,
      source: step.id,
      target: flow.steps[i + 1].id,
      style: { stroke: '#94A3B8', strokeWidth: 2 },
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94A3B8' },
    }));

    const layoutedNodes = layoutFlow(rfNodes, rfEdges);
    return { flowNodes: layoutedNodes, flowEdges: rfEdges };
  }, [result, activeFlowIdx]);

  /* Sync React Flow state when the memo output changes (tab switch) */
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const handleTabClick = useCallback((idx: number) => {
    setActiveFlowIdx(idx);
  }, []);

  if (!result) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: '400px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Execution Flow</h2>

        {/* Tab bar */}
        {result.executionFlows.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {result.executionFlows.map((flow, idx) => (
              <button
                key={flow.id}
                onClick={() => handleTabClick(idx)}
                className={`px-4 py-1.5 text-sm rounded-md transition ${
                  idx === activeFlowIdx
                    ? 'bg-white text-gray-800 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {flow.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 sm:gap-4 mb-3 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stepColors.entry }} /> Entry
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stepColors.exit }} /> Exit
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: stepColors.service }} /> Service
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: stepColors.decision, transform: 'rotate(45deg)' }} /> Decision
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: stepColors.database }} /> Database
        </span>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
