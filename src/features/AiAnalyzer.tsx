import { useState, useCallback } from 'react';
import { aiAnalyze } from '@/lib/ipc';
import type { AiAnalysisResult } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

interface AiAnalyzerProps {
  dirPath: string;
  dirName?: string;
  dirSize?: number;
  ollamaUrl?: string;
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

function AiAnalyzer({ dirPath, dirName, dirSize, ollamaUrl }: AiAnalyzerProps) {
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiAnalyze(dirPath, ollamaUrl);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败');
    } finally {
      setLoading(false);
    }
  }, [dirPath, ollamaUrl]);

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

      {error && (
        <p className="text-xs text-macos-red">{error}</p>
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

      {!result && !loading && !error && (
        <p className="text-xs text-macos-text-tertiary">
          使用 Ollama 本地模型分析未知目录用途
        </p>
      )}
    </div>
  );
}

export default AiAnalyzer;
