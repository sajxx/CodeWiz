import { FileDown, FileText } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { exportMarkdown, exportPdf } from '@/lib/export';

export default function TopBar() {
  const result = useAnalysisStore((s) => s.result);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Left: project name */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800 truncate">
          {result?.projectName ?? 'Loading…'}
        </h1>

        {/* Tech stack badges */}
        {result && (
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
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

      {/* Right: export buttons */}
      <div className="flex items-center gap-2">
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
