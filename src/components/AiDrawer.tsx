import { useState, useCallback } from 'react';
import { aiAnalyze } from '@/lib/ipc';
import type { AiAnalysisResult, AiProviderConfig } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

interface AiDrawerProps {
  dirPath: string;
  dirName?: string;
  dirSize?: number;
}

const STORAGE_KEY = 'maccleaner-settings';

function loadProviderConfig(): { enabled: boolean } & AiProviderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { type: 'ollama', enabled: false };
    const s = JSON.parse(raw);
    const base = s.aiProvider === 'openai'
      ? { type: 'openai' as const, url: s.openaiUrl, model: s.openaiModel, apiKey: s.openaiApiKey }
      : s.aiProvider === 'anthropic'
        ? { type: 'anthropic' as const, model: s.anthropicModel, apiKey: s.anthropicApiKey }
        : { type: 'ollama' as const, url: s.ollamaUrl || 'http://localhost:11434', model: s.ollamaModel || 'llama3.2' };
    return { ...base, enabled: !!s.aiEnabled };
  } catch {
    return { type: 'ollama', enabled: false };
  }
}

const categoryIcons: Record<string, string> = {
  cache: '🗂️',
  config: '⚙️',
  data: '📁',
  log: '📋',
  unknown: '❓',
};

const riskColors: Record<string, string> = {
  low: 'bg-macos-green/20 text-macos-green',
  medium: 'bg-yellow-500/20 text-yellow-500',
  high: 'bg-macos-red/20 text-macos-red',
};

const riskLabels: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export default function AiDrawer({ dirPath, dirName, dirSize, onClose }: AiDrawerProps & { onClose: () => void }) {
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const config = loadProviderConfig();

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiAnalyze(dirPath, config);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败');
    } finally {
      setLoading(false);
    }
  }, [dirPath, config]);

  return (
    <div className="absolute inset-y-0 right-0 z-10 flex w-96 max-w-[40%] flex-col border-l border-macos-separator bg-macos-content-light shadow-xl"
         style={{ backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-macos-separator px-4 py-3">
        <h3 className="text-sm font-bold">🤖 AI 分析</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-macos-text-tertiary hover:bg-macos-surface-hover hover:text-macos-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {dirName && dirSize !== undefined && (
          <p className="text-xs text-macos-text-tertiary mb-3">
            {dirName} · {formatBytes(dirSize)}
          </p>
        )}

        {/* Action bar */}
        <div className="mb-3">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                分析中...
              </span>
            ) : result ? '🔄 重新分析' : '▶️ 开始分析'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-macos-red/20 bg-macos-red/5 p-3 text-xs text-macos-red">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {/* Identity card */}
            <div className="rounded-lg bg-macos-surface/80 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{categoryIcons[result.category] ?? '❓'}</span>
                <span className="text-sm font-bold">{result.software}</span>
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${riskColors[result.riskLevel]}`}>
                  {riskLabels[result.riskLevel]}
                </span>
              </div>
              <p className="text-xs text-macos-text-secondary">{result.description}</p>
            </div>

            {/* Recommendation */}
            <div className="rounded-lg bg-macos-surface/80 p-3">
              <div className="text-xs font-semibold text-macos-text-primary mb-1">💡 推荐操作</div>
              <p className="text-xs text-macos-text-secondary">{result.recommendedAction}</p>
              {result.safeToDelete && (
                <div className="mt-2 text-xs font-medium text-macos-green">✅ 可安全清理</div>
              )}
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-40 text-macos-text-tertiary">
            <span className="text-3xl mb-2 opacity-50">🤖</span>
            <p className="text-xs text-center">
              使用 {config.type === 'ollama' ? 'Ollama' : config.type === 'anthropic' ? 'Claude' : 'AI'} 模型<br />
              分析目录用途与清理风险
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
