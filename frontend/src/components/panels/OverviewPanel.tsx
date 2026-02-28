import { FileText, Boxes, Code2, AlertTriangle, FolderOpen, GitBranch, Clock, ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useState, useCallback } from 'react';
import AIExplanationPopup from '@/components/modals/AIExplanationPopup';
import FileContentViewer from '@/components/modals/FileContentViewer';
import type { FileTreeNode } from '@shared/types';

export default function OverviewPanel() {
  const result = useAnalysisStore((s) => s.result);
  const [explainBadge, setExplainBadge] = useState<string | null>(null);
  const [viewFilePath, setViewFilePath] = useState<string | null>(null);

  if (!result) return <PanelSkeleton />;

  const totalFiles = result.repoStats?.totalFiles ?? result.modules.reduce((a, m) => a + m.fileCount, 0);
  const sourceFiles = result.repoStats?.sourceFiles ?? totalFiles;
  const configFiles = result.repoStats?.configFiles ?? 0;
  const totalModules = result.modules.length;
  const languages = result.techStack.filter((t) => t.type === 'language').length;
  const criticalCount = result.modules.filter((m) => m.riskLevel === 'critical').length;

  const overallRisk =
    criticalCount >= 2 ? 'High' : criticalCount === 1 ? 'Medium' : 'Low';
  const riskColor =
    overallRisk === 'High'
      ? 'text-red-600 bg-red-50'
      : overallRisk === 'Medium'
        ? 'text-yellow-600 bg-yellow-50'
        : 'text-green-600 bg-green-50';

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Overview</h2>

      {/* Repo Details Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600">
        {result.repositoryUrl && (
          <a
            href={result.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium truncate max-w-xs sm:max-w-md"
          >
            <GitBranch className="w-4 h-4 shrink-0" />
            {result.repositoryUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
          </a>
        )}
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400" />
          {new Date(result.analyzedAt).toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-gray-400" />
          {sourceFiles} source &middot; {configFiles} config
        </span>
      </div>

      {/* Architecture Summary */}
      <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-3 sm:p-5 rounded-r-lg text-gray-700 leading-relaxed text-sm sm:text-base">
        {result.architectureSummary}
      </blockquote>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <StatCard icon={FileText} label="Total Files" value={totalFiles} />
        <StatCard icon={Boxes} label="Modules" value={totalModules} />
        <StatCard icon={Code2} label="Languages" value={languages} />
        <div className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl ${riskColor}`}>
          <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          <div>
            <p className="text-xl sm:text-2xl font-bold">{overallRisk}</p>
            <p className="text-xs opacity-70">Overall Risk</p>
          </div>
        </div>
      </div>

      {/* Tech Stack Badges */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Tech Stack
        </h3>
        <div className="flex flex-wrap gap-2">
          {result.techStack.map((t) => (
            <button
              key={t.name}
              onClick={() => setExplainBadge(t.name)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition hover:shadow-md cursor-pointer"
              style={{
                borderColor: t.color,
                backgroundColor: `${t.color}10`,
                color: t.color,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* File Structure */}
      {result.fileTree && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            File Structure
            <span className="text-[10px] font-normal text-gray-400 ml-1">(click a file to view)</span>
          </h3>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 max-h-80 overflow-y-auto font-mono text-xs">
            <FileTreeView node={result.fileTree} depth={0} onFileClick={setViewFilePath} />
          </div>
        </div>
      )}

      {/* AI Explanation Popup for badges */}
      {explainBadge && (
        <AIExplanationPopup
          elementType="tech_stack_badge"
          elementName={explainBadge}
          onClose={() => setExplainBadge(null)}
        />
      )}

      {/* File Content Viewer */}
      {viewFilePath && (
        <FileContentViewer
          filePath={viewFilePath}
          onClose={() => setViewFilePath(null)}
        />
      )}
    </div>
  );
}

/* ── File Tree Viewer ── */
function FileTreeView({ node, depth, onFileClick }: { node: FileTreeNode; depth: number; onFileClick: (path: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 2); // auto-expand top 2 levels

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  if (node.type === 'file') {
    return (
      <button
        onClick={() => onFileClick(node.path)}
        className="flex items-center gap-1.5 py-0.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded px-1 cursor-pointer w-full text-left transition"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <File className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const children = node.children ?? [];
  // Sort: directories first, then files, each alphabetically
  const sorted = [...children].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 py-0.5 w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded px-1 font-medium"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        )}
        <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="truncate">{node.name || node.path || '/'}</span>
        <span className="ml-auto text-[10px] text-gray-400 tabular-nums">{children.length}</span>
      </button>
      {expanded && sorted.map((child, i) => (
        <FileTreeView key={child.path || `${child.name}-${i}`} node={child} depth={depth + 1} onFileClick={onFileClick} />
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 shrink-0" />
      <div>
        <p className="text-xl sm:text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-12 bg-gray-200 rounded" />
      <div className="h-24 bg-gray-200 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  );
}
