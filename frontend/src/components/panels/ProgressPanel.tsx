import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useProgressStore } from '@/store/progressStore';

const statusConfig = {
  pending: { icon: Circle, color: 'text-gray-300', bg: 'bg-gray-50', label: 'Pending' },
  active: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', label: 'In Progress' },
  done: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Done' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Error' },
} as const;

export default function ProgressPanel() {
  const steps = useProgressStore((s) => s.steps);
  const isComplete = useProgressStore((s) => s.isComplete);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Analysis Progress</h2>
      <p className="text-gray-500 mb-8">
        {isComplete
          ? 'Analysis complete! Navigate to any section from the sidebar.'
          : 'Analyzing your codebase. This may take a few moments…'}
      </p>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const cfg = statusConfig[step.status];
          const Icon = cfg.icon;
          return (
            <div
              key={step.step}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${cfg.bg} ${
                step.status === 'active' ? 'border-blue-200 shadow-sm' : 'border-transparent'
              }`}
            >
              <span className="text-sm font-medium text-gray-400 w-6 text-right">
                {i + 1}
              </span>
              <Icon
                className={`w-5 h-5 ${cfg.color} shrink-0 ${
                  step.status === 'active' ? 'animate-spin' : ''
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{step.step}</p>
                {step.message && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {step.message}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-green-700 font-medium">
            All steps completed successfully!
          </p>
        </div>
      )}
    </div>
  );
}
