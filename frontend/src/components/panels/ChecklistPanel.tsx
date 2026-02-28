import { BookOpen, Wrench, Rocket } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import AIExplanationPopup from '@/components/modals/AIExplanationPopup';
import { useState } from 'react';
import type { ChecklistPhaseType } from '@shared/types';

const phaseIcons: Record<ChecklistPhaseType, React.ElementType> = {
  read: BookOpen,
  setup: Wrench,
  start: Rocket,
};

const phaseColors: Record<ChecklistPhaseType, string> = {
  read: 'border-blue-400 bg-blue-50',
  setup: 'border-amber-400 bg-amber-50',
  start: 'border-green-400 bg-green-50',
};

export default function ChecklistPanel() {
  const result = useAnalysisStore((s) => s.result);
  const checkedItems = useAnalysisStore((s) => s.checkedItems);
  const toggleItem = useAnalysisStore((s) => s.toggleChecklistItem);
  const [explainFile, setExplainFile] = useState<{
    name: string;
    path: string;
  } | null>(null);

  if (!result) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        New Developer Checklist
      </h2>
      <p className="text-gray-500 mb-8">
        Follow these steps to get up to speed on the codebase.
      </p>

      <div className="space-y-8">
        {result.checklist.map((phase) => {
          const Icon = phaseIcons[phase.phase];
          return (
            <div key={phase.phase}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  {phase.title}
                </h3>
              </div>

              <div className="space-y-2">
                {phase.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border-l-4 transition ${
                      phaseColors[phase.phase]
                    } ${checkedItems[item.id] ? 'opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems[item.id] ?? false}
                      onChange={() => toggleItem(item.id)}
                      className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          checkedItems[item.id]
                            ? 'line-through text-gray-400'
                            : 'text-gray-700'
                        }`}
                      >
                        {item.label}
                        {item.isRequired && (
                          <span className="ml-1 text-red-400 text-xs">*</span>
                        )}
                      </p>
                      {item.filePath && (
                        <button
                          onClick={() =>
                            setExplainFile({
                              name: item.filePath!,
                              path: item.filePath!,
                            })
                          }
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
                        >
                          {item.filePath}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {explainFile && (
        <AIExplanationPopup
          elementType="service_file"
          elementName={explainFile.name}
          context={explainFile.path}
          onClose={() => setExplainFile(null)}
        />
      )}
    </div>
  );
}
