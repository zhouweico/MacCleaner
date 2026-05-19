import { useState, useCallback } from 'react';
import { aiAnalyze } from '@/lib/ipc';
import type { AiAnalysisResult, AiProviderConfig } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import AutoHideScroll from './AutoHideScroll';

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
  config: '️',
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

export default function AiDrawer({ dirPath, dirName, dirSize }: AiDrawerProps) {
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
    <div className="absolute top-0 right-0 bottom-[60px] z-30 flex w-96 max-w-[50%] flex-col border-l border-macos-separator bg-macos-content-light shadow-xl"
         style={{ backdropFilter: 'blur(20px)' }}>
      {/* Header — 两行结构，与详情页标题栏高度一致 */}
      <div className="flex shrink-0 items-center gap-3 border-b border-macos-separator px-4 pr-10 py-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">AI 分析</h3>
          {dirName && (
            <p className="text-xs text-macos-text-tertiary truncate">{dirName}</p>
          )}
        </div>
      </div>

      {/* Content — 使用 AutoHideScroll 与其他面板一致 */}
      <AutoHideScroll className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {/* Size info */}
          {dirSize !== undefined && (
            <p className="text-xs text-macos-text-tertiary">
              目录大小：{formatBytes(dirSize)}
            </p>
          )}

          {/* Action bar */}
          <div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full rounded-lg bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-400 hover:bg-purple-500/30 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  分析中...
                </>
              ) : result ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重新分析
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  开始分析
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-macos-red/20 bg-macos-red/5 p-3 text-xs text-macos-red">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Identity card */}
              <div className="rounded-xl border border-macos-separator bg-macos-surface/60 p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="text-lg">{categoryIcons[result.category] ?? '❓'}</span>
                  <span className="text-sm font-semibold text-macos-text-primary">{result.software}</span>
                </div>
                <p className="text-xs leading-relaxed text-macos-text-secondary">{result.description}</p>
              </div>

              {/* Risk level card */}
              <div className="rounded-xl border border-macos-separator bg-macos-surface/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🛡️</span>
                  <span className="text-xs font-semibold text-macos-text-primary">风险评估</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold ${riskColors[result.riskLevel]}`}>
                    {riskLabels[result.riskLevel]}
                  </span>
                  {result.safeToDelete && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-macos-green">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      可安全清理
                    </span>
                  )}
                </div>
              </div>

              {/* Recommendation */}
              <div className="rounded-xl border border-macos-separator bg-macos-surface/60 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">💡</span>
                  <span className="text-xs font-semibold text-macos-text-primary">推荐操作</span>
                </div>
                <p className="text-xs leading-relaxed text-macos-text-secondary">{result.recommendedAction}</p>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-macos-text-tertiary">
              <span className="text-4xl mb-3 opacity-40">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </span>
              <p className="text-xs text-center leading-relaxed">
                使用 {config.type === 'ollama' ? 'Ollama' : config.type === 'anthropic' ? 'Claude' : 'AI'} 模型<br />
                分析目录用途与清理风险
              </p>
            </div>
          )}
        </div>
      </AutoHideScroll>
    </div>
  );
}
