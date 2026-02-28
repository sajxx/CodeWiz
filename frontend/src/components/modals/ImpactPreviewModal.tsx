import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, FileText, GitBranch, Settings } from 'lucide-react';
import { fetchImpact } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';
import type { ImpactResult, ImpactLevel } from '@shared/types';

interface Props {
  filePath: string;
  onClose: () => void;
}

const levelConfig: Record<
  ImpactLevel,
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  direct: { icon: FileText, label: 'Direct Import', color: 'text-red-600', bg: 'bg-red-50' },
  transitive: { icon: GitBranch, label: 'Transitive', color: 'text-amber-600', bg: 'bg-amber-50' },
  config: { icon: Settings, label: 'Config', color: 'text-gray-600', bg: 'bg-gray-50' },
};

export default function ImpactPreviewModal({ filePath, onClose }: Props) {
  const sessionId = useAnalysisStore((s) => s.sessionId);
  const [data, setData] = useState<ImpactResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchImpact({ session_id: sessionId ?? '', file_path: filePath })
      .then(setData)
      .finally(() => setLoading(false));
  }, [sessionId, filePath]);

  const grouped = data
    ? {
        direct: data.affected.filter((a) => a.level === 'direct'),
        transitive: data.affected.filter((a) => a.level === 'transitive'),
        config: data.affected.filter((a) => a.level === 'config'),
      }
    : null;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-white rounded-2xl shadow-2xl outline-none max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-800">
              Impact Preview
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-4 sm:px-6 py-4 sm:py-5 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : data && grouped ? (
              <>
                {/* Target file */}
                <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-500 uppercase tracking-widest mb-1">
                    Target File
                  </p>
                  <p className="text-sm font-mono text-blue-800">
                    {data.targetFile}
                  </p>
                </div>

                {/* Grouped affected files */}
                {(
                  ['direct', 'transitive', 'config'] as ImpactLevel[]
                ).map((level) => {
                  const files = grouped[level];
                  if (!files.length) return null;
                  const cfg = levelConfig[level];
                  const Icon = cfg.icon;
                  return (
                    <div key={level} className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                        <h4 className={`text-sm font-semibold ${cfg.color}`}>
                          {cfg.label} ({files.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {files.map((f) => (
                          <div
                            key={f.path}
                            className={`p-3 rounded-lg ${cfg.bg} border border-transparent`}
                          >
                            <p className="text-sm font-mono text-gray-800">
                              {f.path}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {f.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Failed to load impact data.
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
