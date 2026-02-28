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
  Panel,
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

/* ── Tooltip wrapper shared by all custom nodes ── */
function NodeTooltip({ description, children }: { description?: string; children: React.ReactNode }) {
  if (!description) return <>{children}</>;
  return (
    <div className="group relative">
      {children}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 hidden group-hover:block w-56">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed">
          {description}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      </div>
    </div>
  );
}

/* ── Step number badge ── */
function StepBadge({ index }: { index: number }) {
  return (
    <span
      className="absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full bg-gray-800 text-white text-[10px] font-bold flex items-center justify-center shadow"
    >
      {index}
    </span>
  );
}

/* ── Custom node: diamond for decision ── */
function DecisionNode({ data }: NodeProps) {
  return (
    <NodeTooltip description={data.description as string | undefined}>
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
        <StepBadge index={data.stepIndex as number} />
        <div
          style={{
            position: 'absolute',
            width: 72,
            height: 72,
            backgroundColor: stepColors.decision,
            borderRadius: 8,
            transform: 'rotate(45deg)',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
          }}
        />
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
    </NodeTooltip>
  );
}

/* ── Custom node: pill for entry / exit ── */
function PillNode({ data }: NodeProps) {
  const bg = (data.stepType as string) === 'exit' ? stepColors.exit : stepColors.entry;
  const shadow = (data.stepType as string) === 'exit'
    ? '0 4px 12px rgba(239, 68, 68, 0.35)'
    : '0 4px 12px rgba(34, 197, 94, 0.35)';
  return (
    <NodeTooltip description={data.description as string | undefined}>
      <div className="relative">
        <StepBadge index={data.stepIndex as number} />
        <div
          style={{
            backgroundColor: bg,
            color: '#fff',
            borderRadius: 9999,
            padding: '10px 30px',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadow,
          }}
        >
          {data.label as string}
          <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
          <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </div>
      </div>
    </NodeTooltip>
  );
}

/* ── Custom node: rectangle for service / database ── */
function RectNode({ data }: NodeProps) {
  const isDb = (data.stepType as string) === 'database';
  const bg = isDb ? stepColors.database : stepColors.service;
  const shadow = isDb
    ? '0 4px 12px rgba(139, 92, 246, 0.35)'
    : '0 4px 12px rgba(59, 130, 246, 0.3)';
  const borderRadius = isDb ? 16 : 8; // cylinder-ish for DB
  return (
    <NodeTooltip description={data.description as string | undefined}>
      <div className="relative">
        <StepBadge index={data.stepIndex as number} />
        <div
          style={{
            backgroundColor: bg,
            color: '#fff',
            borderRadius,
            padding: '12px 18px',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadow,
          }}
        >
          {isDb && <span className="mr-1.5">🗄️</span>}
          {data.label as string}
          <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
          <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </div>
      </div>
    </NodeTooltip>
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

    const rfNodes: Node[] = flow.steps.map((step, idx) => {
      const isDecision = step.type === 'decision';
      const isPill = step.type === 'entry' || step.type === 'exit';
      return {
        id: step.id,
        type: isDecision ? 'decision' : isPill ? 'pill' : 'rect',
        data: {
          label: step.label,
          stepType: step.type,
          description: step.description,
          stepIndex: idx + 1,
        },
        position: { x: 0, y: 0 },
      };
    });

    const rfEdges: Edge[] = flow.steps.slice(0, -1).map((step, i) => {
      const isFromDecision = step.type === 'decision';
      return {
        id: `flow-edge-${i}`,
        source: step.id,
        target: flow.steps[i + 1].id,
        style: {
          stroke: isFromDecision ? '#F59E0B' : '#94A3B8',
          strokeWidth: 2,
          strokeDasharray: isFromDecision ? '6 3' : undefined,
        },
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isFromDecision ? '#F59E0B' : '#94A3B8',
        },
        label: isFromDecision ? 'yes' : undefined,
        labelStyle: { fontSize: '10px', fill: '#F59E0B', fontWeight: 600 },
        labelBgStyle: { fill: '#FEF3C7', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

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
          <Panel position="top-right">
            <div className="bg-white/80 backdrop-blur rounded-lg p-2 text-xs text-gray-500">
              Hover a step for details
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Step list sidebar */}
      {result.executionFlows.length > 0 && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 max-h-48 overflow-y-auto">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            {result.executionFlows[activeFlowIdx]?.name} — Steps
          </h4>
          <ol className="space-y-1">
            {result.executionFlows[activeFlowIdx]?.steps.map((step, i) => (
              <li key={step.id} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-0.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: stepColors[step.type] || '#94A3B8' }}
                >
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium text-gray-800">{step.label}</span>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
