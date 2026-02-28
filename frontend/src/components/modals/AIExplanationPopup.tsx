import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { fetchExplanation } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';
import type { ExplainElementType, ExplainResponse } from '@shared/types';

interface Props {
  elementType: ExplainElementType;
  elementName: string;
  context?: string;
  onClose: () => void;
}

export default function AIExplanationPopup({
  elementType,
  elementName,
  context,
  onClose,
}: Props) {
  const sessionId = useAnalysisStore((s) => s.sessionId);
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchExplanation({
      session_id: sessionId ?? '',
      element_type: elementType,
      element_name: elementName,
      context,
    })
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId, elementType, elementName, context]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] sm:w-full max-w-lg bg-white rounded-2xl shadow-2xl p-0 outline-none max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <Dialog.Title className="text-base sm:text-lg font-semibold text-gray-800 truncate pr-2">
              {elementName}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-4 sm:py-5">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : data ? (
              <>
                <p className="text-sm text-gray-700 leading-relaxed mb-6">
                  {data.explanation}
                </p>

                {/* Links */}
                {data.links.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                      Related Resources
                    </h4>
                    <div className="space-y-2">
                      {data.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition group"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                              {link.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {link.url}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Failed to load explanation.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
