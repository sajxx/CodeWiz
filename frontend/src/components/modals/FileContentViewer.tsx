import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, FileCode, Copy, Check } from 'lucide-react';
import { fetchFileContent } from '@/lib/api';
import { useAnalysisStore } from '@/store/analysisStore';

interface Props {
  filePath: string;
  onClose: () => void;
}

/** Map file extension to a display-friendly language name */
function langFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript (JSX)',
    js: 'JavaScript',
    jsx: 'JavaScript (JSX)',
    py: 'Python',
    json: 'JSON',
    yml: 'YAML',
    yaml: 'YAML',
    md: 'Markdown',
    css: 'CSS',
    html: 'HTML',
    toml: 'TOML',
    env: 'Environment',
    sh: 'Shell',
    dockerfile: 'Dockerfile',
  };
  return map[ext] ?? ext.toUpperCase();
}

export default function FileContentViewer({ filePath, onClose }: Props) {
  const sessionId = useAnalysisStore((s) => s.sessionId);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFileContent(sessionId ?? '', filePath)
      .then((res) => {
        if (!cancelled) setContent(res.content);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load file');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, filePath]);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = content ? content.split('\n').length : 0;
  const lang = langFromPath(filePath);
  const fileName = filePath.split('/').pop() ?? filePath;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] sm:w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-0 outline-none max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <FileCode className="w-5 h-5 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <Dialog.Title className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                  {fileName}
                </Dialog.Title>
                <p className="text-xs text-gray-400 truncate">{filePath}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs text-gray-400 hidden sm:inline">
                {lang} &middot; {lineCount} lines
              </span>
              {content && (
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
              <Dialog.Close asChild>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : content !== null ? (
              <div className="relative">
                <pre className="text-xs sm:text-sm leading-relaxed overflow-x-auto">
                  <code className="block">
                    {content.split('\n').map((line, i) => (
                      <div
                        key={i}
                        className="flex hover:bg-blue-50/50 transition-colors"
                      >
                        <span className="select-none text-right text-gray-300 w-10 sm:w-12 pr-3 shrink-0 inline-block border-r border-gray-100 bg-gray-50/50 py-px">
                          {i + 1}
                        </span>
                        <span className="pl-3 pr-4 py-px text-gray-700 whitespace-pre">
                          {line || ' '}
                        </span>
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-gray-500">No content available.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-t border-gray-100 text-xs text-gray-400">
            <span>{lang}</span>
            <span>{lineCount} lines</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
