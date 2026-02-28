import { FileText, Boxes, Code2, AlertTriangle } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useState } from 'react';
import AIExplanationPopup from '@/components/modals/AIExplanationPopup';

export default function OverviewPanel() {
  const result = useAnalysisStore((s) => s.result);
  const [explainBadge, setExplainBadge] = useState<string | null>(null);

  if (!result) return <PanelSkeleton />;

  const totalFiles = result.modules.reduce((a, m) => a + m.fileCount, 0);
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
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Overview</h2>

      {/* Architecture Summary */}
      <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-5 rounded-r-lg text-gray-700 leading-relaxed">
        {result.architectureSummary}
      </blockquote>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Files" value={totalFiles} />
        <StatCard icon={Boxes} label="Modules" value={totalModules} />
        <StatCard icon={Code2} label="Languages" value={languages} />
        <div className={`flex items-center gap-3 p-4 rounded-xl ${riskColor}`}>
          <AlertTriangle className="w-8 h-8 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{overallRisk}</p>
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

      {/* AI Explanation Popup for badges */}
      {explainBadge && (
        <AIExplanationPopup
          elementType="tech_stack_badge"
          elementName={explainBadge}
          onClose={() => setExplainBadge(null)}
        />
      )}
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
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <Icon className="w-8 h-8 text-blue-500 shrink-0" />
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-24 bg-gray-200 rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
