import {
  LayoutDashboard,
  GitBranch,
  Boxes,
  Workflow,
  BarChart3,
  ListChecks,
  Loader2,
  X,
  FileDown,
  FileText,
} from 'lucide-react';
import { useAnalysisStore, type ActivePanel } from '@/store/analysisStore';
import { useProgressStore } from '@/store/progressStore';
import { exportMarkdown, exportPdf } from '@/lib/export';

const navItems: { panel: ActivePanel; label: string; icon: React.ElementType }[] = [
  { panel: 'overview', label: 'Overview', icon: LayoutDashboard },
  { panel: 'dependency-graph', label: 'Dependency Graph', icon: GitBranch },
  { panel: 'core-components', label: 'Core Components', icon: Boxes },
  { panel: 'execution-flow', label: 'Execution Flow', icon: Workflow },
  { panel: 'complexity-scores', label: 'Complexity Scores', icon: BarChart3 },
  { panel: 'checklist', label: 'New Dev Checklist', icon: ListChecks },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const activePanel = useAnalysisStore((s) => s.activePanel);
  const setActivePanel = useAnalysisStore((s) => s.setActivePanel);
  const isComplete = useProgressStore((s) => s.isComplete);
  const result = useAnalysisStore((s) => s.result);

  const handleNavClick = (panel: ActivePanel) => {
    setActivePanel(panel);
    onMobileClose?.();
  };

  const sidebarContent = (
    <aside className="w-[260px] lg:w-[260px] bg-slate-900 text-white flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">CodeLens</h2>
        {/* Close button visible only on mobile overlay */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Progress link */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <button
          onClick={() => handleNavClick('progress')}
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
            onClick={() => handleNavClick(panel)}
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

      {/* Mobile export buttons */}
      <div className="lg:hidden p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={() => result && exportPdf(result)}
          disabled={!result}
          className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileDown className="w-4 h-4" />
          Export PDF
        </button>
        <button
          onClick={() => result && exportMarkdown(result)}
          disabled={!result}
          className="w-full flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Export Markdown
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        Hackathon 2026
      </div>
    </aside>
  );

  // Desktop: always visible inline sidebar
  // Mobile: overlay drawer when mobileOpen is true
  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden lg:block h-full">{sidebarContent}</div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="relative z-10 animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
