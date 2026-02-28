import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ProgressPanel from '@/components/panels/ProgressPanel';
import OverviewPanel from '@/components/panels/OverviewPanel';
import DependencyGraphPanel from '@/components/panels/DependencyGraphPanel';
import CoreComponentsPanel from '@/components/panels/CoreComponentsPanel';
import ExecutionFlowPanel from '@/components/panels/ExecutionFlowPanel';
import ComplexityScoresPanel from '@/components/panels/ComplexityScoresPanel';
import ChecklistPanel from '@/components/panels/ChecklistPanel';
import ChatbotDrawer from '@/components/chatbot/ChatbotDrawer';
import { useAnalysisStore } from '@/store/analysisStore';
import { useProgressStore } from '@/store/progressStore';
import { fetchAnalysisResult } from '@/lib/api';
import { connectProgressSocket } from '@/lib/ws';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

const panelMap = {
  progress: ProgressPanel,
  overview: OverviewPanel,
  'dependency-graph': DependencyGraphPanel,
  'core-components': CoreComponentsPanel,
  'execution-flow': ExecutionFlowPanel,
  'complexity-scores': ComplexityScoresPanel,
  checklist: ChecklistPanel,
} as const;

export default function Dashboard() {
  const sessionId = useAnalysisStore((s) => s.sessionId);
  const setResult = useAnalysisStore((s) => s.setResult);
  const activePanel = useAnalysisStore((s) => s.activePanel);
  const setActivePanel = useAnalysisStore((s) => s.setActivePanel);
  const updateStep = useProgressStore((s) => s.updateStep);
  const simulateComplete = useProgressStore((s) => s.simulateComplete);
  const isComplete = useProgressStore((s) => s.isComplete);
  const toggleChat = useChatStore((s) => s.toggleOpen);
  const isChatOpen = useChatStore((s) => s.isOpen);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Connect WebSocket for progress & load mock data
  useEffect(() => {
    if (!sessionId) return;

    // Try to connect real websocket
    const ws = connectProgressSocket(
      sessionId,
      (event) => updateStep(event),
      () => {
        // On WS error — use mock: simulate all steps done after 2s
        setTimeout(() => {
          simulateComplete();
        }, 2000);
      },
    );

    // Also load the analysis result (mock for now)
    fetchAnalysisResult(sessionId).then((result) => {
      setResult(result);
    });

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Auto-switch to overview when analysis completes
  useEffect(() => {
    if (isComplete && activePanel === 'progress') {
      const timeout = setTimeout(() => setActivePanel('overview'), 800);
      return () => clearTimeout(timeout);
    }
  }, [isComplete, activePanel, setActivePanel]);

  const PanelComponent = panelMap[activePanel];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6">
          <PanelComponent />
        </main>
      </div>

      {/* Floating chatbot button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 z-40"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Chatbot drawer */}
      {isChatOpen && <ChatbotDrawer />}
    </div>
  );
}
