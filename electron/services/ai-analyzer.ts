import { execFileNoThrow } from '../utils/execFileNoThrow';
import { readdir, stat } from 'fs/promises';

export interface AiAnalysisResult {
  software: string;
  category: 'cache' | 'config' | 'data' | 'log' | 'unknown';
  safeToDelete: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  recommendedAction: string;
}

/**
 * Analyze a directory using Ollama local AI model.
 */
export async function analyzeWithOllama(
  dirPath: string,
  ollamaUrl: string = 'http://localhost:11434',
): Promise<AiAnalysisResult> {
  // Gather directory info
  const dirName = dirPath.split('/').pop() ?? dirPath;
  let dirStat;
  try {
    dirStat = await stat(dirPath);
  } catch {
    return {
      software: '未知',
      category: 'unknown',
      safeToDelete: false,
      riskLevel: 'high',
      description: '无法访问该目录',
      recommendedAction: '跳过',
    };
  }

  const sizeBytes = dirStat.isDirectory() ? await getDirSize(dirPath) : dirStat.size;
  const sizeHuman = formatBytes(sizeBytes);

  // Get directory structure (top 20 entries)
  let structure: string[] = [];
  if (dirStat.isDirectory()) {
    try {
      const entries = await readdir(dirPath);
      structure = entries.slice(0, 20);
    } catch {}
  }

  const prompt = `你是一个 macOS 系统分析助手。请分析以下目录的用途：

目录路径: ${dirPath}
目录名称: ${dirName}
目录大小: ${sizeHuman}
内部结构:
${structure.map(s => `  - ${s}`).join('\n')}
修改时间: ${dirStat.mtime.toISOString()}

请仅用 JSON 格式回答，不要其他文字。格式如下：
{
  "software": "最可能属于哪个软件/工具",
  "category": "cache/config/data/log/unknown 之一",
  "safeToDelete": true或false,
  "riskLevel": "low/medium/high",
  "description": "简要说明这个目录的用途",
  "recommendedAction": "推荐的操作（保留/清理/备份后清理）"
}`;

  try {
    const response = await callOllama(ollamaUrl, prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Fall back to rule-based analysis
    return ruleBasedAnalysis(dirName, structure, sizeBytes);
  }

  return ruleBasedAnalysis(dirName, structure, sizeBytes);
}

/**
 * Rule-based fallback analysis when AI is unavailable.
 */
function ruleBasedAnalysis(
  dirName: string,
  structure: string[],
  sizeBytes: number,
): AiAnalysisResult {
  const lower = dirName.toLowerCase();
  const KNOWN_CACHE = ['cache', 'caches', 'tmp', 'temp', 'logs', 'log'];
  const KNOWN_CONFIG = ['config', 'settings', 'preferences', 'prefs', '.dot'];
  const KNOWN_DATA = ['data', 'database', 'db', 'backup', 'sessions'];

  // Check for cache indicators
  if (KNOWN_CACHE.some(k => lower.includes(k))) {
    return {
      software: '系统缓存',
      category: 'cache',
      safeToDelete: true,
      riskLevel: 'low',
      description: `目录名包含缓存相关关键词，可能是应用缓存或临时文件。`,
      recommendedAction: '可以安全清理',
    };
  }

  // Check for config indicators
  if (KNOWN_CONFIG.some(k => lower.includes(k))) {
    return {
      software: '应用配置',
      category: 'config',
      safeToDelete: false,
      riskLevel: 'high',
      description: `目录名包含配置相关关键词，可能包含应用设置和用户偏好。`,
      recommendedAction: '建议保留，除非确认不再使用对应应用',
    };
  }

  // Check for data indicators
  if (KNOWN_DATA.some(k => lower.includes(k))) {
    return {
      software: '应用数据',
      category: 'data',
      safeToDelete: false,
      riskLevel: 'medium',
      description: `目录名包含数据相关关键词，可能包含用户数据或会话。`,
      recommendedAction: '清理前请备份重要数据',
    };
  }

  // Check for known tool patterns
  const knownTools: Record<string, Partial<AiAnalysisResult>> = {
    'claude': { software: 'Claude Code', category: 'config', riskLevel: 'high' },
    'codex': { software: 'Codex CLI', category: 'config', riskLevel: 'high' },
    'qwen': { software: 'Qwen CLI', category: 'config', riskLevel: 'high' },
    'kube': { software: 'Kubernetes', category: 'config', riskLevel: 'high' },
    'docker': { software: 'Docker', category: 'config', riskLevel: 'high' },
    'nvm': { software: 'NVM', category: 'data', riskLevel: 'medium' },
    'conda': { software: 'Conda', category: 'data', riskLevel: 'medium' },
    'npm': { software: 'npm', category: 'cache', riskLevel: 'low' },
  };

  for (const [pattern, info] of Object.entries(knownTools)) {
    if (lower.includes(pattern)) {
      return {
        software: info.software ?? '未知工具',
        category: info.category ?? 'unknown',
        safeToDelete: info.category === 'cache',
        riskLevel: info.riskLevel ?? 'medium',
        description: `检测到已知工具: ${info.software}`,
        recommendedAction: info.category === 'cache' ? '可以安全清理' : '建议保留配置文件',
      };
    }
  }

  // Default: unknown
  return {
    software: '未知',
    category: 'unknown',
    safeToDelete: false,
    riskLevel: 'medium',
    description: `无法识别此目录，大小 ${formatBytes(sizeBytes)}，包含 ${structure.length} 个条目。`,
    recommendedAction: '建议先了解内容后再决定是否清理',
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function getDirSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execFileNoThrow('du', ['-sk', dirPath]);
    const kb = parseInt(stdout.split('\t')[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}

async function callOllama(url: string, prompt: string): Promise<string> {
  const body = JSON.stringify({
    model: 'llama3.2',
    prompt,
    stream: false,
  });

  const { stdout, stderr } = await execFileNoThrow('curl', [
    '-s',
    '-X', 'POST',
    `${url}/api/generate`,
    '-H', 'Content-Type: application/json',
    '-d', body,
  ]);

  if (stderr && stderr.includes('refused')) {
    throw new Error('无法连接到 Ollama 服务');
  }

  try {
    const data = JSON.parse(stdout);
    return data.response ?? '';
  } catch {
    throw new Error('Ollama 响应解析失败');
  }
}
