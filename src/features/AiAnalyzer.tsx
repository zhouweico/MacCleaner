import { useState, useCallback } from 'react';
import { aiAnalyze } from '@/lib/ipc';
import type { AiAnalysisResult, AiProviderConfig } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { toast } from '@/components/Toast';

interface AiAnalyzerProps {
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

function AiAnalyzer({ dirPath, dirName, dirSize }: AiAnalyzerProps) {
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const config = loadProviderConfig();

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiAnalyze(dirPath, config);
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI 分析失败');
    } finally {
      setLoading(false);
    }
  }, [dirPath, config]);

  if (!config.enabled) return null;

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-purple-400">🤖 AI 分析</h3>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="text-xs rounded bg-purple-500/20 px-2 py-1 text-purple-400 hover:bg-purple-500/30 disabled:opacity-40 transition-colors"
        >
          {loading ? '分析中...' : result ? '重新分析' : '开始分析'}
        </button>
      </div>

      {dirName && dirSize !== undefined && (
        <p className="text-xs text-macos-text-tertiary mb-2">
          {dirName} · {formatBytes(dirSize)}
        </p>
      )}

      {result && (
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{categoryIcons[result.category] ?? '❓'}</span>
            <span className="text-xs font-medium">{result.software}</span>
            <span className={`text-xs rounded px-1.5 py-0.5 ${riskColors[result.riskLevel]}`}>
              {riskLabels[result.riskLevel]}
            </span>
          </div>
          <p className="text-xs text-macos-text-secondary">{result.description}</p>
          <p className="text-xs font-medium text-macos-text-primary">
            💡 {result.recommendedAction}
          </p>
          {result.safeToDelete && (
            <p className="text-xs text-macos-green">✅ 可安全清理</p>
          )}
        </div>
      )}

      {!result && !loading && (
        <p className="text-xs text-macos-text-tertiary">
          使用 {config.type === 'ollama' ? 'Ollama' : config.type === 'anthropic' ? 'Claude' : 'AI'} 模型分析未知目录用途
        </p>
      )}
    </div>
  );
}

export default AiAnalyzer;
