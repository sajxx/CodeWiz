import { FileDown, FileText, Menu, Code2 } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { exportMarkdown, exportPdf } from '@/lib/export';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const result = useAnalysisStore((s) => s.result);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left: hamburger + project name */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 hover:bg-gray-100 rounded-lg transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Mobile logo (visible only when sidebar is hidden) */}
        <div className="lg:hidden flex items-center gap-2">
          <Code2 className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-gray-800 text-sm">CodeWiz</span>
        </div>

        <h1 className="hidden sm:block text-lg font-semibold text-gray-800 truncate">
          {result?.projectName ?? 'Loading…'}
        </h1>

        {/* Tech stack badges - hidden on mobile & tablet */}
        {result && (
          <div className="hidden xl:flex items-center gap-1.5 flex-wrap">
            {result.techStack.slice(0, 6).map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${t.color}20`, color: t.color }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: export buttons - hidden on mobile (they're in sidebar mobile menu) */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          onClick={() => result && exportPdf(result)}
          disabled={!result}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileDown className="w-4 h-4" />
          PDF
        </button>
        <button
          onClick={() => result && exportMarkdown(result)}
          disabled={!result}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Markdown
        </button>
      </div>
    </header>
  );
}
