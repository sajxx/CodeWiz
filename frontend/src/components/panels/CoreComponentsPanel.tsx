import { useState } from 'react';
import { ChevronRight, ArrowLeft, Zap } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import AIExplanationPopup from '@/components/modals/AIExplanationPopup';
import ImpactPreviewModal from '@/components/modals/ImpactPreviewModal';
import type { RiskLevel } from '@shared/types';

const riskColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900',
};

export default function CoreComponentsPanel() {
  const result = useAnalysisStore((s) => s.result);
  const selectedModuleId = useAnalysisStore((s) => s.selectedModuleId);
  const setSelectedModuleId = useAnalysisStore((s) => s.setSelectedModuleId);
  const [explainService, setExplainService] = useState<string | null>(null);
  const [impactFilePath, setImpactFilePath] = useState<string | null>(null);

  if (!result) return <div className="text-gray-400">Loading…</div>;

  const selectedModule = selectedModuleId
    ? result.modules.find((m) => m.id === selectedModuleId)
    : null;

  // Module Detail View
  if (selectedModule) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button
            onClick={() => setSelectedModuleId(null)}
            className="hover:text-blue-600 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            All Modules
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-800 font-medium">{selectedModule.name}</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
          {selectedModule.name}
        </h2>
        <p className="text-gray-600 mb-6">{selectedModule.role}</p>

        {/* Services list */}
        <div className="space-y-3">
          {selectedModule.services.map((svc) => (
            <div
              key={svc.id}
              className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => setExplainService(svc.name)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{svc.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImpactFilePath(svc.path);
                  }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                >
                  <Zap className="w-3 h-3" />
                  Impact Preview
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-2">{svc.role}</p>
              <p className="text-xs text-gray-400">
                Path: {svc.path}
              </p>
              {svc.dependencies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {svc.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {dep.split('/').pop()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {explainService && (
          <AIExplanationPopup
            elementType="service_file"
            elementName={explainService}
            onClose={() => setExplainService(null)}
          />
        )}
        {impactFilePath && (
          <ImpactPreviewModal
            filePath={impactFilePath}
            onClose={() => setImpactFilePath(null)}
          />
        )}
      </div>
    );
  }

  // Card Grid View
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Core Components</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {result.modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => setSelectedModuleId(mod.id)}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-lg transition group"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">
                {mod.name}
              </h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskColors[mod.riskLevel]}`}
              >
                {mod.riskLevel}
              </span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">{mod.role}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{mod.fileCount} files</span>
              <span className="flex items-center gap-1">
                View details
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
