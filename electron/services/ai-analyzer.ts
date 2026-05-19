import { execFileNoThrow } from '../utils/execFileNoThrow';

export interface AiAnalysisResult {
  software: string;
  category: 'cache' | 'config' | 'data' | 'log' | 'unknown';
  safeToDelete: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  recommendedAction: string;
}

export interface AiProviderConfig {
  type: 'ollama' | 'openai' | 'anthropic';
  url?: string;           // Ollama/OpenAI base URL
  model?: string;          // Model name
  apiKey?: string;         // API key (OpenAI/Anthropic)
}

/**
 * Unified AI analysis entry point.
 * Routes to the configured provider, falls back to rule-based analysis.
 */
export async function analyzeDirectory(
  dirPath: string,
  config: AiProviderConfig,
): Promise<AiAnalysisResult> {
  // Gather directory info (shared across all providers)
  const dirInfo = await gatherDirInfo(dirPath);
  if (!dirInfo) {
    return {
      software: '未知',
      category: 'unknown',
      safeToDelete: false,
      riskLevel: 'high',
      description: '无法访问该目录',
      recommendedAction: '跳过',
    };
  }

  const prompt = buildPrompt(dirInfo);

  try {
    switch (config.type) {
      case 'ollama':
        return await analyzeWithOllama(prompt, config.url || 'http://localhost:11434', config.model ?? 'llama3.2');
      case 'openai':
        return await analyzeWithOpenAI(prompt, config.url || 'https://api.openai.com/v1', config.apiKey || '', config.model || 'gpt-4o-mini');
      case 'anthropic':
        return await analyzeWithAnthropic(prompt, config.apiKey || '', config.model || 'claude-sonnet-4-6');
      default:
        return ruleBasedAnalysis(dirInfo);
    }
  } catch {
    return ruleBasedAnalysis(dirInfo);
  }
}

/**
 * Test connection to an AI provider.
 */
export async function testProviderConnection(config: AiProviderConfig): Promise<boolean> {
  try {
    switch (config.type) {
      case 'ollama': {
        const url = config.url || 'http://localhost:11434';
        await callOllama(url, 'Say "ok"', config.model || 'llama3.2');
        return true;
      }
      case 'openai': {
        const url = config.url || 'https://api.openai.com/v1';
        const apiKey = config.apiKey || '';
        const model = config.model || 'gpt-4o-mini';
        const resp = await fetch(`${url}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ok' }], max_tokens: 1 }),
        });
        return resp.ok;
      }
      case 'anthropic': {
        const apiKey = config.apiKey || '';
        const model = config.model || 'claude-sonnet-4-6';
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ok' }], max_tokens: 1 }),
        });
        return resp.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// ─── Directory Info Gathering ───

interface DirInfo {
  dirPath: string;
  dirName: string;
  sizeBytes: number;
  sizeHuman: string;
  structure: string[];
  modified: string;
}

async function gatherDirInfo(dirPath: string): Promise<DirInfo | null> {
  const { readdir, stat } = await import('fs/promises');
  const dirName = dirPath.split('/').pop() ?? dirPath;

  let dirStat;
  try {
    dirStat = await stat(dirPath);
  } catch {
    return null;
  }

  const sizeBytes = dirStat.isDirectory() ? await getDirSize(dirPath) : dirStat.size;

  let structure: string[] = [];
  if (dirStat.isDirectory()) {
    try {
      const entries = await readdir(dirPath);
      structure = entries.slice(0, 20);
    } catch {}
  }

  return {
    dirPath,
    dirName,
    sizeBytes,
    sizeHuman: formatBytes(sizeBytes),
    structure,
    modified: dirStat.mtime.toISOString(),
  };
}

function buildPrompt(info: DirInfo): string {
  return `你是一个 macOS 系统分析助手。请分析以下目录的用途：

目录路径: ${info.dirPath}
目录名称: ${info.dirName}
目录大小: ${info.sizeHuman}
内部结构:
${info.structure.map(s => `  - ${s}`).join('\n')}
修改时间: ${info.modified}

请仅用 JSON 格式回答，不要其他文字。格式如下：
{
  "software": "最可能属于哪个软件/工具",
  "category": "cache/config/data/log/unknown 之一",
  "safeToDelete": true或false,
  "riskLevel": "low/medium/high",
  "description": "简要说明这个目录的用途",
  "recommendedAction": "推荐的操作（保留/清理/备份后清理）"
}`;
}

// ─── Ollama Adapter ───

async function analyzeWithOllama(prompt: string, url: string, model = 'llama3.2'): Promise<AiAnalysisResult> {
  const response = await callOllama(url, prompt, model);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Ollama 响应解析失败');
}

async function callOllama(url: string, prompt: string, model: string): Promise<string> {
  const body = JSON.stringify({ model, prompt, stream: false });
  const { stdout, stderr } = await execFileNoThrow('curl', [
    '-s', '-X', 'POST', `${url}/api/generate`,
    '-H', 'Content-Type: application/json',
    '-d', body,
  ]);

  if (stderr && stderr.includes('refused')) {
    throw new Error('无法连接到 Ollama 服务');
  }

  const data = JSON.parse(stdout);
  return data.response ?? '';
}

// ─── OpenAI-compatible Adapter ───

async function analyzeWithOpenAI(prompt: string, baseUrl: string, apiKey: string, model: string): Promise<AiAnalysisResult> {
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个 macOS 系统分析助手。只返回 JSON，不要其他文字。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenAI API error: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('OpenAI 响应解析失败');
}

// ─── Anthropic Adapter ───

async function analyzeWithAnthropic(prompt: string, apiKey: string, model: string): Promise<AiAnalysisResult> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'user', content: `你是一个 macOS 系统分析助手。请只返回 JSON 格式，不要其他文字。\n\n${prompt}` },
      ],
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Anthropic API error: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.content?.[0]?.text ?? '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Anthropic 响应解析失败');
}

// ─── Rule-based Fallback ───

function ruleBasedAnalysis(info: DirInfo): AiAnalysisResult {
  const lower = info.dirName.toLowerCase();
  const KNOWN_CACHE = ['cache', 'caches', 'tmp', 'temp', 'logs', 'log'];
  const KNOWN_CONFIG = ['config', 'settings', 'preferences', 'prefs'];
  const KNOWN_DATA = ['data', 'database', 'db', 'backup', 'sessions'];

  if (KNOWN_CACHE.some(k => lower.includes(k))) {
    return {
      software: '系统缓存', category: 'cache', safeToDelete: true, riskLevel: 'low',
      description: `目录名包含缓存相关关键词，可能是应用缓存或临时文件。`,
      recommendedAction: '可以安全清理',
    };
  }
  if (KNOWN_CONFIG.some(k => lower.includes(k))) {
    return {
      software: '应用配置', category: 'config', safeToDelete: false, riskLevel: 'high',
      description: `目录名包含配置相关关键词，可能包含应用设置和用户偏好。`,
      recommendedAction: '建议保留，除非确认不再使用对应应用',
    };
  }
  if (KNOWN_DATA.some(k => lower.includes(k))) {
    return {
      software: '应用数据', category: 'data', safeToDelete: false, riskLevel: 'medium',
      description: `目录名包含数据相关关键词，可能包含用户数据或会话。`,
      recommendedAction: '清理前请备份重要数据',
    };
  }

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

  for (const [pattern, info_] of Object.entries(knownTools)) {
    if (lower.includes(pattern)) {
      return {
        software: info_.software ?? '未知工具', category: info_.category ?? 'unknown',
        safeToDelete: info_.category === 'cache', riskLevel: info_.riskLevel ?? 'medium',
        description: `检测到已知工具: ${info_.software}`,
        recommendedAction: info_.category === 'cache' ? '可以安全清理' : '建议保留配置文件',
      };
    }
  }

  return {
    software: '未知', category: 'unknown', safeToDelete: false, riskLevel: 'medium',
    description: `无法识别此目录，大小 ${info.sizeHuman}，包含 ${info.structure.length} 个条目。`,
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
