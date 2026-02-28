import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Github, ArrowRight, Code2 } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useProgressStore } from '@/store/progressStore';
import { useChatStore } from '@/store/chatStore';
import { submitAnalysis } from '@/lib/api';

export default function LandingPage() {
  const navigate = useNavigate();
  const setSessionId = useAnalysisStore((s) => s.setSessionId);
  const setActivePanel = useAnalysisStore((s) => s.setActivePanel);
  const resetAnalysis = useAnalysisStore((s) => s.reset);
  const resetProgress = useProgressStore((s) => s.reset);
  const resetChat = useChatStore((s) => s.reset);

  const [githubUrl, setGithubUrl] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValid = githubUrl.trim().length > 0 || zipFile !== null;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.zip') || file.type === 'application/zip')) {
      setZipFile(file);
      setGithubUrl('');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setZipFile(file);
      setGithubUrl('');
    }
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    resetAnalysis();
    resetProgress();
    resetChat();

    try {
      let response;
      if (zipFile) {
        const formData = new FormData();
        formData.append('file', zipFile);
        response = await submitAnalysis(formData);
      } else {
        response = await submitAnalysis({ github_url: githubUrl });
      }

      setSessionId(response.session_id);
      setActivePanel('progress');
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to start analysis. Is the backend running?';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6">
      <div className="w-full max-w-lg">
        {/* Logo / Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 mb-3 sm:mb-4">
            <Code2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">CodeWiz</h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base px-2">
            Understand any codebase in minutes, not hours.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          {/* GitHub URL Input */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Repository URL
          </label>
          <div className="relative mb-4 sm:mb-6">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              placeholder="https://github.com/user/repo"
              value={githubUrl}
              onChange={(e) => {
                setGithubUrl(e.target.value);
                if (e.target.value) setZipFile(null);
              }}
              disabled={zipFile !== null}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:text-gray-400 text-sm sm:text-base"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : zipFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => document.getElementById('zip-input')?.click()}
          >
            <input
              id="zip-input"
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            {zipFile ? (
              <>
                <Upload className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">{zipFile.name}</p>
                <p className="text-xs text-green-500 mt-1">
                  {(zipFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                  onClick={(e) => { e.stopPropagation(); setZipFile(null); }}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Drag & drop a ZIP file here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">.zip files only</p>
              </>
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full mt-5 sm:mt-6 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                Analyze
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
