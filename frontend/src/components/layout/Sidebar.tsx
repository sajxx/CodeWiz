import {
  LayoutDashboard,
  GitBranch,
  Boxes,
  Workflow,
  BarChart3,
  ListChecks,
  Loader2,
} from 'lucide-react';
import { useAnalysisStore, type ActivePanel } from '@/store/analysisStore';
import { useProgressStore } from '@/store/progressStore';

const navItems: { panel: ActivePanel; label: string; icon: React.ElementType }[] = [
  { panel: 'overview', label: 'Overview', icon: LayoutDashboard },
  { panel: 'dependency-graph', label: 'Dependency Graph', icon: GitBranch },
  { panel: 'core-components', label: 'Core Components', icon: Boxes },
  { panel: 'execution-flow', label: 'Execution Flow', icon: Workflow },
  { panel: 'complexity-scores', label: 'Complexity Scores', icon: BarChart3 },
  { panel: 'checklist', label: 'New Dev Checklist', icon: ListChecks },
];

export default function Sidebar() {
  const activePanel = useAnalysisStore((s) => s.activePanel);
  const setActivePanel = useAnalysisStore((s) => s.setActivePanel);
  const isComplete = useProgressStore((s) => s.isComplete);

  return (
    <aside className="w-[260px] bg-slate-900 text-white flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700">
        <h2 className="text-lg font-bold tracking-tight">CodeLens</h2>
      </div>

      {/* Progress link */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <button
          onClick={() => setActivePanel('progress')}
          className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
            activePanel === 'progress'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Loader2
            className={`w-4 h-4 ${activePanel === 'progress' && !isComplete ? 'animate-spin' : ''}`}
          />
          Analysis Progress
        </button>

        {/* Divider */}
        <div className="mx-5 my-2 h-px bg-slate-700" />

        {/* Nav items */}
        {navItems.map(({ panel, label, icon: Icon }) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            disabled={!isComplete}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
              activePanel === panel
                ? 'bg-slate-700 text-white'
                : isComplete
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        Hackathon 2026
      </div>
    </aside>
  );
}
