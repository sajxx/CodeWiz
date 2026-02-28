import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Panel,
  MarkerType,
} from '@xyflow/react';
import dagre from 'dagre';
import { useAnalysisStore } from '@/store/analysisStore';
import AIExplanationPopup from '@/components/modals/AIExplanationPopup';
import type { GraphNodeType } from '@shared/types';

/* ── Colour palettes ──────────────────────────────────────────────────────── */

const typeColors: Record<GraphNodeType, string> = {
  core: '#3B82F6',
  utility: '#22C55E',
  entry: '#F97316',
  config: '#9CA3AF',
};

const groupColors: Record<string, string> = {
  'Entry Points':    '#F97316',
  'API Layer':       '#8B5CF6',
  'Business Logic':  '#3B82F6',
  'Data Layer':      '#06B6D4',
  'UI Components':   '#EC4899',
  'Configuration':   '#9CA3AF',
  'Utilities':       '#22C55E',
  'Infrastructure':  '#EAB308',
};

const GROUP_FALLBACK_COLOR = '#6366F1';

function colorForNode(
  group: string | undefined,
  type: GraphNodeType,
  useGroups: boolean,
): string {
  if (useGroups && group) {
    return groupColors[group] ?? GROUP_FALLBACK_COLOR;
  }
  return typeColors[type] ?? typeColors.core;
}

/* ── Importance → visual size ─────────────────────────────────────────────── */

function sizeForImportance(importance: number | undefined): { w: number; padY: number; fontSize: number } {
  const imp = importance ?? 3;
  if (imp >= 5) return { w: 220, padY: 12, fontSize: 14 };
  if (imp >= 4) return { w: 200, padY: 10, fontSize: 13 };
  if (imp >= 3) return { w: 180, padY: 8, fontSize: 12 };
  return { w: 160, padY: 6, fontSize: 11 };
}

/* ── Layout via dagre ─────────────────────────────────────────────────────── */

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  showEdgeLabels: boolean,
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    const labelLen = ((node.data?.label as string) ?? '').length;
    const baseW = (node.data?.baseWidth as number) ?? 180;
    const w = Math.max(baseW, Math.min(300, labelLen * 9 + 40));
    const h = (node.data?.baseHeight as number) ?? 50;
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const dagNode = g.node(node.id);
    return {
      ...node,
      position: {
        x: dagNode.x - dagNode.width / 2,
        y: dagNode.y - dagNode.height / 2,
      },
    };
  });

  const maxImport = Math.max(1, ...edges.map((e) => (e.data?.importCount as number) ?? 1));

  const layoutedEdges: Edge[] = edges.map((edge) => {
    const count = (edge.data?.importCount as number) ?? 1;
    const semanticLabel = (edge.data?.semanticLabel as string) ?? '';
    const thickness = 1 + Math.round((count / maxImport) * 4);
    const isHeavy = count / maxImport > 0.6;

    let displayLabel: string | undefined;
    if (showEdgeLabels) {
      if (semanticLabel) {
        displayLabel = semanticLabel;
      } else if (count > 0) {
        displayLabel = String(count);
      }
    }

    return {
      ...edge,
      label: displayLabel,
      style: {
        ...edge.style,
        strokeWidth: thickness,
        stroke: isHeavy ? '#EF4444' : '#94A3B8',
      },
      animated: isHeavy,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isHeavy ? '#EF4444' : '#94A3B8',
      },
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
}

/* ── Tooltip component ────────────────────────────────────────────────────── */

function NodeTooltip({ node }: { node: Node }) {
  const desc = node.data?.description as string | undefined;
  const group = node.data?.group as string | undefined;
  const importance = node.data?.importance as number | undefined;
  if (!desc && !group) return null;

  return (
    <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 pointer-events-none">
      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[260px] whitespace-normal">
        {group && (
          <div className="text-gray-400 font-medium mb-0.5">{group}</div>
        )}
        {desc && <div>{desc}</div>}
        {importance != null && (
          <div className="mt-1 text-yellow-300">
            {'★'.repeat(importance)}{'☆'.repeat(5 - importance)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function DependencyGraphPanel() {
  const result = useAnalysisStore((s) => s.result);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [colorByGroup, setColorByGroup] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Detect whether AI enrichment is present
  const hasAIData = useMemo(() => {
    if (!result) return false;
    return result.graph.nodes.some((n) => n.group || n.description);
  }, [result]);

  const layoutResult = useMemo(() => {
    if (!result) return { nodes: [] as Node[], edges: [] as Edge[] };

    const rfNodes: Node[] = result.graph.nodes.map((n) => {
      const color = colorForNode(n.group, n.type, colorByGroup && hasAIData);
      const isEntry = n.type === 'entry';
      const { w, padY, fontSize } = sizeForImportance(n.importance);

      return {
        id: n.id,
        data: {
          label: n.label,
          nodeType: n.type,
          filePath: n.filePath,
          description: n.description ?? '',
          group: n.group ?? '',
          importance: n.importance ?? 3,
          baseWidth: w,
          baseHeight: 40 + padY,
        },
        position: { x: 0, y: 0 },
        style: {
          backgroundColor: color,
          color: '#fff',
          borderRadius: isEntry ? '9999px' : '10px',
          padding: isEntry ? `${padY}px 22px` : `${padY}px 16px`,
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          border: isEntry ? '2px solid #EA580C' : `1px solid ${color}88`,
          minWidth: `${w - 40}px`,
          textAlign: 'center' as const,
          boxShadow: `0 4px 14px ${color}33`,
          transition: 'box-shadow 0.2s, transform 0.2s',
        },
      };
    });

    const rfEdges: Edge[] = result.graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: { importCount: e.importCount, semanticLabel: e.label ?? '' },
      animated: false,
      style: { stroke: '#94A3B8', strokeWidth: 1 },
      labelStyle: { fontSize: '10px', fill: '#64748B', fontWeight: 500 },
      labelBgStyle: { fill: '#F1F5F9', fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
    }));

    return getLayoutedElements(rfNodes, rfEdges, showEdgeLabels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, showEdgeLabels, colorByGroup, hasAIData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutResult.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutResult.edges);

  useEffect(() => {
    setNodes(layoutResult.nodes);
    setEdges(layoutResult.edges);
  }, [layoutResult, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data.label as string);
  }, []);

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNode(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // Build legend entries
  const legendEntries = useMemo(() => {
    if (colorByGroup && hasAIData && result) {
      const groups = new Set<string>();
      result.graph.nodes.forEach((n) => {
        if (n.group) groups.add(n.group);
      });
      return Array.from(groups).map((g) => ({
        label: g,
        color: groupColors[g] ?? GROUP_FALLBACK_COLOR,
      }));
    }
    return (Object.entries(typeColors) as [GraphNodeType, string][]).map(
      ([type, color]) => ({ label: type, color }),
    );
  }, [colorByGroup, hasAIData, result]);

  if (!result) return <div className="text-gray-400">Loading graph…</div>;

  // Find hovered node for tooltip
  const hoveredRfNode = hoveredNode
    ? nodes.find((n) => n.id === hoveredNode) ?? null
    : null;

  return (
    <div className="h-full flex flex-col" style={{ minHeight: '400px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Dependency Graph</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Legend */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
            {legendEntries.map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-5 h-0.5 bg-red-500 rounded" />
              heavy coupling
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Group/type toggle — only shown when AI data is present */}
            {hasAIData && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={colorByGroup}
                  onChange={(e) => setColorByGroup(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Group colors
              </label>
            )}
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
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background />
          <Panel position="top-right">
            <div className="bg-white/80 backdrop-blur rounded-lg p-2 text-xs text-gray-500">
              {hasAIData
                ? 'AI-enhanced graph — hover for details, click for explanation'
                : 'Click a node for AI explanation'}
            </div>
          </Panel>
        </ReactFlow>

        {/* Floating tooltip for hovered node */}
        {hoveredRfNode && (hoveredRfNode.data?.description || hoveredRfNode.data?.group) && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: (hoveredRfNode.position?.x ?? 0) + ((hoveredRfNode.data?.baseWidth as number) ?? 180) / 2,
              top: (hoveredRfNode.position?.y ?? 0) - 10,
              transform: 'translateX(-50%) translateY(-100%)',
            }}
          >
            <NodeTooltip node={hoveredRfNode} />
          </div>
        )}
      </div>

      {/* Module details sidebar — only when AI data is present */}
      {hasAIData && (
        <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Module Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {result.graph.nodes
              .filter((n) => n.description)
              .sort((a, b) => (b.importance ?? 3) - (a.importance ?? 3))
              .map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2 text-xs p-2 bg-white rounded-lg border border-gray-100"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0"
                    style={{
                      backgroundColor: colorForNode(
                        n.group,
                        n.type,
                        colorByGroup && hasAIData,
                      ),
                    }}
                  />
                  <div>
                    <div className="font-medium text-gray-800">
                      {n.label}
                      {n.importance != null && n.importance >= 4 && (
                        <span className="ml-1 text-yellow-500">{'★'.repeat(n.importance - 3)}</span>
                      )}
                    </div>
                    <div className="text-gray-500">{n.description}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

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
