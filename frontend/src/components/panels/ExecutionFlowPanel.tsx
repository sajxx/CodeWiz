import { useState, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import dagre from 'dagre';
import { useAnalysisStore } from '@/store/analysisStore';
import type { FlowStepType } from '@shared/types';

const stepStyles: Record<FlowStepType, { bg: string; shape: string }> = {
  entry:    { bg: '#22C55E', shape: 'rounded-full' },
  exit:     { bg: '#22C55E', shape: 'rounded-full' },
  service:  { bg: '#3B82F6', shape: 'rounded-lg' },
  decision: { bg: '#F59E0B', shape: 'rotate-45' },
  database: { bg: '#8B5CF6', shape: 'rounded-lg' },
};

function layoutFlow(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 70 });

  nodes.forEach((n) => g.setNode(n.id, { width: 220, height: 60 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 110, y: pos.y - 30 } };
  });
}

export default function ExecutionFlowPanel() {
  const result = useAnalysisStore((s) => s.result);
  const [activeFlowIdx, setActiveFlowIdx] = useState(0);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!result || !result.executionFlows.length)
      return { flowNodes: [], flowEdges: [] };

    const flow = result.executionFlows[activeFlowIdx];

    const rfNodes: Node[] = flow.steps.map((step) => {
      const cfg = stepStyles[step.type];
      const isDecision = step.type === 'decision';
      const isPill = step.type === 'entry' || step.type === 'exit';
      return {
        id: step.id,
        data: { label: step.label },
        position: { x: 0, y: 0 },
        style: {
          backgroundColor: cfg.bg,
          color: '#fff',
          borderRadius: isPill ? '9999px' : isDecision ? '8px' : '8px',
          padding: isPill ? '8px 24px' : '10px 16px',
          fontSize: '12px',
          fontWeight: 600,
          border: 'none',
          transform: isDecision ? 'rotate(45deg)' : undefined,
          minWidth: isDecision ? '80px' : '180px',
          minHeight: isDecision ? '80px' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center' as const,
        },
      };
    });

    const rfEdges: Edge[] = flow.steps.slice(0, -1).map((step, i) => ({
      id: `flow-edge-${i}`,
      source: step.id,
      target: flow.steps[i + 1].id,
      style: { stroke: '#94A3B8', strokeWidth: 2 },
      animated: true,
    }));

    const layoutedNodes = layoutFlow(rfNodes, rfEdges);
    return { flowNodes: layoutedNodes, flowEdges: rfEdges };
  }, [result, activeFlowIdx]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  if (!result) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Execution Flow</h2>

        {/* Tab bar */}
        {result.executionFlows.length > 1 && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {result.executionFlows.map((flow, idx) => (
              <button
                key={flow.id}
                onClick={() => setActiveFlowIdx(idx)}
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
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500" /> Entry / Exit
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500" /> Service
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500" style={{ transform: 'rotate(45deg)' }} /> Decision
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500" /> Database
        </span>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
