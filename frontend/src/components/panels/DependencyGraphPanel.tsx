import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Panel,
} from '@xyflow/react';
import dagre from 'dagre';
import { useAnalysisStore } from '@/store/analysisStore';
import AIExplanationPopup from '@/components/modals/AIExplanationPopup';
import type { GraphNodeType } from '@shared/types';

const nodeColors: Record<GraphNodeType, string> = {
  core: '#3B82F6',     // blue
  utility: '#22C55E',  // green
  entry: '#F97316',    // orange
  config: '#9CA3AF',   // grey
};

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  showEdgeLabels: boolean,
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 180, height: 50 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 25,
      },
    };
  });

  const layoutedEdges: Edge[] = edges.map((edge) => ({
    ...edge,
    label: showEdgeLabels ? String(edge.data?.importCount ?? '') : undefined,
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

export default function DependencyGraphPanel() {
  const result = useAnalysisStore((s) => s.result);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const layoutResult = useMemo(() => {
    if (!result) return { nodes: [] as Node[], edges: [] as Edge[] };

    const rfNodes: Node[] = result.graph.nodes.map((n) => ({
      id: n.id,
      data: { label: n.label, nodeType: n.type, filePath: n.filePath },
      position: { x: 0, y: 0 },
      style: {
        backgroundColor: nodeColors[n.type],
        color: '#fff',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: 600,
        border: 'none',
        minWidth: '140px',
        textAlign: 'center' as const,
      },
    }));

    const rfEdges: Edge[] = result.graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: { importCount: e.importCount },
      animated: false,
      style: { stroke: '#94A3B8' },
      labelStyle: { fontSize: '10px', fill: '#64748B' },
    }));

    return getLayoutedElements(rfNodes, rfEdges, showEdgeLabels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, showEdgeLabels]);

  const [nodes, , onNodesChange] = useNodesState(layoutResult.nodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutResult.edges);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data.label as string);
  }, []);

  if (!result) return <div className="text-gray-400">Loading graph…</div>;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Dependency Graph</h2>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            {(Object.entries(nodeColors) as [GraphNodeType, string][]).map(
              ([type, color]) => (
                <span key={type} className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: color }}
                  />
                  {type}
                </span>
              ),
            )}
          </div>
          {/* Toggle edge labels */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showEdgeLabels}
              onChange={(e) => setShowEdgeLabels(e.target.checked)}
              className="rounded border-gray-300"
            />
            Edge labels
          </label>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background />
          <Panel position="top-right">
            <div className="bg-white/80 backdrop-blur rounded-lg p-2 text-xs text-gray-500">
              Click a node for AI explanation
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && (
        <AIExplanationPopup
          elementType="graph_node"
          elementName={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
