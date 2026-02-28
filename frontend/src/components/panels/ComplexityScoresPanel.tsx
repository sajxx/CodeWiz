import { useState, useMemo } from 'react';
import { ArrowUpDown, AlertTriangle } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import AIExplanationPopup from '@/components/modals/AIExplanationPopup';
import type { ComplexityScore, RiskLevel } from '@shared/types';

type SortKey = 'name' | 'fileCount' | 'dependencyCount' | 'avgLines' | 'couplingScore' | 'riskLevel';
type SortDir = 'asc' | 'desc';

const riskOrder: Record<RiskLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const riskBadge: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

export default function ComplexityScoresPanel() {
  const result = useAnalysisStore((s) => s.result);
  const [sortKey, setSortKey] = useState<SortKey>('riskLevel');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [explainRow, setExplainRow] = useState<ComplexityScore | null>(null);

  const sorted = useMemo(() => {
    if (!result) return [];
    const scores = [...result.complexityScores];
    scores.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'riskLevel') {
        cmp = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      } else if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return scores;
  }, [result, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (!result) return <div className="text-gray-400">Loading…</div>;

  const criticalCount = result.complexityScores.filter(
    (c) => c.riskLevel === 'critical',
  ).length;
  const mediumCount = result.complexityScores.filter(
    (c) => c.riskLevel === 'medium',
  ).length;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Complexity Scores</h2>

      {/* Summary Banner */}
      <div className="flex items-start sm:items-center gap-3 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4 sm:mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>{criticalCount}</strong> module{criticalCount !== 1 ? 's are' : ' is'}{' '}
          critical risk, <strong>{mediumCount}</strong> {mediumCount !== 1 ? 'are' : 'is'}{' '}
          medium risk.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {([
                ['name', 'Module'],
                ['fileCount', 'File Count'],
                ['dependencyCount', 'Dependencies'],
                ['avgLines', 'Avg Lines'],
                ['couplingScore', 'Coupling'],
                ['riskLevel', 'Risk'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                  onClick={() => handleSort(key)}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((score) => (
              <tr
                key={score.moduleId}
                className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition"
                onClick={() => setExplainRow(score)}
              >
                <td className="px-4 py-3 font-medium text-gray-800">
                  {score.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{score.fileCount}</td>
                <td className="px-4 py-3 text-gray-600">
                  {score.dependencyCount}
                </td>
                <td className="px-4 py-3 text-gray-600">{score.avgLines}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="text-xs">{score.couplingLevel}</span>
                  <span className="text-gray-400 ml-1">({score.couplingScore})</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskBadge[score.riskLevel]}`}
                  >
                    {score.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {explainRow && (
        <AIExplanationPopup
          elementType="complexity_row"
          elementName={explainRow.name}
          context={explainRow.aiCommentary}
          onClose={() => setExplainRow(null)}
        />
      )}
    </div>
  );
}
