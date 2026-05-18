import { execFileNoThrow } from '../utils/execFileNoThrow';
import type { ModuleId, ModuleScanResult, ScanItem } from '../types';
import { homedir } from 'os';
import { join } from 'path';
import { readdir, stat } from 'fs/promises';

const home = homedir();

export async function getDiskUsage(): Promise<{
  total: number;
  used: number;
  available: number;
  percent: number;
}> {
  const { stdout } = await execFileNoThrow('df', ['-h', '/']);
  const lines = stdout.trim().split('\n');
  if (lines.length < 2) return { total: 0, used: 0, available: 0, percent: 0 };

  const parts = lines[1].split(/\s+/);
  return {
    total: parseSizeStr(parts[1]),
    used: parseSizeStr(parts[2]),
    available: parseSizeStr(parts[3]),
    percent: parseInt(parts[4], 10),
  };
}

function parseSizeStr(size: string): number {
  const match = size.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { '': 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
  return Math.round(value * (multipliers[unit] ?? 1));
}

export async function scanModule(moduleId: ModuleId): Promise<ModuleScanResult> {
  const scanners: Record<ModuleId, () => Promise<{ items: ScanItem[]; totalSize: number }>> = {
    brew: scanBrew,
    docker: scanDocker,
    npm: scanNpm,
    conda: scanConda,
    'system-cache': scanSystemCache,
    'cli-tools': scanCliTools,
    downloads: scanDownloads,
  };

  const { items, totalSize } = await scanners[moduleId]();
  return {
    moduleId,
    totalSize,
    itemCount: items.length,
    items,
    scannedAt: new Date(),
  };
}

async function scanBrew() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const cachePath = join(home, 'Library/Caches/Homebrew');
  const cacheSize = await getDirSize(cachePath);
  if (cacheSize > 0) {
    const children = await scanDirChildren(cachePath);
    items.push({
      name: 'Homebrew 下载缓存',
      path: cachePath,
      size: cacheSize,
      type: 'cache',
      safeToRemove: true,
      children,
    });
    totalSize += cacheSize;
  }

  return { items, totalSize };
}

async function scanDocker() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const { stdout } = await execFileNoThrow('docker', ['system', 'df', '--format', '{{json .}}']);
  try {
    const data = JSON.parse(stdout);
    if (data.Reclaimable) {
      items.push({
        name: '可回收空间',
        path: '',
        size: data.Reclaimable,
        type: 'cache',
        safeToRemove: true,
      });
      totalSize += data.Reclaimable;
    }
  } catch {
    /* Docker 未运行或输出格式变化 */
  }

  return { items, totalSize };
}

async function scanNpm() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const npmCachePath = join(home, '.npm');
  const npmCacheSize = await getDirSize(npmCachePath);
  items.push({
    name: 'npm 缓存',
    path: npmCachePath,
    size: npmCacheSize,
    type: 'cache',
    safeToRemove: true,
  });
  totalSize += npmCacheSize;

  // nvm 旧版本
  const nvmPath = join(home, '.nvm', 'versions', 'node');
  try {
    const versions = await readdir(nvmPath);
    const { stdout: current } = await execFileNoThrow('node', ['--version']);
    const currentVersion = current.trim().replace('v', '');

    for (const v of versions) {
      if (v !== currentVersion) {
        const vPath = join(nvmPath, v);
        const vSize = await getDirSize(vPath);
        const children = await scanDirChildren(vPath);
        items.push({
          name: `Node.js ${v} (旧版本)`,
          path: vPath,
          size: vSize,
          type: 'cache',
          safeToRemove: false,
          description: `当前使用 ${currentVersion}`,
          children,
        });
        totalSize += vSize;
      }
    }
  } catch {
    /* nvm 未安装 */
  }

  // npm cache children
  const npmChildren = await scanDirChildren(npmCachePath);
  items[0].children = npmChildren;

  return { items, totalSize };
}

async function scanConda() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const envsPaths = [
    join(home, '.conda', 'envs'),
    join(home, 'dev', 'miniconda3', 'envs'),
  ];

  for (const envPath of envsPaths) {
    try {
      const envs = await readdir(envPath);
      for (const env of envs) {
        const fullEnvPath = join(envPath, env);
        const envSize = await getDirSize(fullEnvPath);
        const children = await scanDirChildren(fullEnvPath);
        items.push({
          name: `Conda: ${env}`,
          path: fullEnvPath,
          size: envSize,
          type: 'data',
          safeToRemove: false,
          children,
        });
        totalSize += envSize;
      }
    } catch {
      /* 路径不存在 */
    }
  }

  const pipCachePaths = [
    join(home, 'Library', 'Caches', 'pip'),
    join(home, '.cache', 'pip'),
  ];
  for (const pipPath of pipCachePaths) {
    const pipSize = await getDirSize(pipPath);
    if (pipSize > 0) {
      const pipChildren = await scanDirChildren(pipPath);
      items.push({
        name: 'pip 缓存',
        path: pipPath,
        size: pipSize,
        type: 'cache',
        safeToRemove: true,
        children: pipChildren,
      });
      totalSize += pipSize;
    }
  }

  return { items, totalSize };
}

async function scanSystemCache() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const cachePaths = [
    join(home, 'Library', 'Caches'),
    join(home, 'Library', 'Logs'),
    join(home, '.cache'),
  ];

  for (const cachePath of cachePaths) {
    try {
      const dirs = await readdir(cachePath);
      for (const dir of dirs.slice(0, 30)) {
        const dirPath = join(cachePath, dir);
        const dirSize = await getDirSize(dirPath);
        if (dirSize > 10 * 1024 * 1024) {
          const children = await scanDirChildren(dirPath);
          items.push({
            name: dir,
            path: dirPath,
            size: dirSize,
            type: 'cache',
            safeToRemove: true,
            children,
          });
          totalSize += dirSize;
        }
      }
    } catch {
      /* 路径不存在 */
    }
  }

  items.sort((a, b) => b.size - a.size);
  return { items, totalSize };
}

async function scanCliTools() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const knownCliDirs: Record<string, string> = {
    'Claude Code': join(home, '.claude'),
    'Codex': join(home, '.codex'),
    'Qwen CLI': join(home, '.qwen'),
    'Kubernetes': join(home, '.kube'),
    'Krew': join(home, '.krew'),
    '飞书 CLI': join(home, '.lark-cli'),
    'Folo RSS': join(home, '.folo'),
  };

  for (const [name, dirPath] of Object.entries(knownCliDirs)) {
    const size = await getDirSize(dirPath);
    if (size > 0) {
      const children = await scanDirChildren(dirPath);
      items.push({
        name,
        path: dirPath,
        size,
        type: 'config',
        safeToRemove: false,
        children,
      });
      totalSize += size;
    }
  }

  return { items, totalSize };
}

async function scanDownloads() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  // 扫描 Downloads 目录
  const downloadsPath = join(home, 'Downloads');
  try {
    const files = await readdir(downloadsPath);
    for (const file of files) {
      const filePath = join(downloadsPath, file);
      const fileStat = await stat(filePath);
      const isDir = fileStat.isDirectory();
      const size = isDir ? await getDirSize(filePath) : fileStat.size;
      let children: ScanItem[] | undefined;

      if (isDir) {
        children = [];
        let dirTotal = 0;
        try {
          const dirFiles = await readdir(filePath);
          for (const sub of dirFiles) {
            const subPath = join(filePath, sub);
            const subStat = await stat(subPath);
            const subSize = subStat.isDirectory() ? await getDirSize(subPath) : subStat.size;
            children.push({
              name: sub,
              path: subPath,
              size: subSize,
              type: subStat.isDirectory() ? 'data' : 'unknown',
              safeToRemove: false,
              modifiedAt: subStat.mtimeMs,
            });
            dirTotal += subSize;
          }
        } catch { /* no permission */ }
      }

      items.push({
        name: file,
        path: filePath,
        size,
        type: isDir ? 'data' : 'unknown',
        safeToRemove: false,
        modifiedAt: fileStat.mtimeMs,
        children,
      });
      totalSize += size;
    }
  } catch {
    /* 路径不存在 */
  }

  // 扫描废纸篓内容
  const trashPath = join(home, '.Trash');
  const trashSize = await getDirSize(trashPath);
  if (trashSize > 0) {
    const trashChildren = await scanDirChildren(trashPath);
    items.push({
      name: '.Trash (废纸篓)',
      path: trashPath,
      size: trashSize,
      type: 'cache',
      safeToRemove: true,
      description: '可清空废纸篓释放空间',
      children: trashChildren,
    });
    totalSize += trashSize;
  }

  return { items, totalSize };
}

/**
 * Get directory size using `du -sk` (macOS compatible).
 * Returns size in bytes.
 */
async function getDirSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execFileNoThrow('du', ['-sk', dirPath]);
    const kb = parseInt(stdout.split('\t')[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}

/**
 * Scan immediate children of a directory.
 */
async function scanDirChildren(dirPath: string): Promise<ScanItem[]> {
  const children: ScanItem[] = [];
  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const entryStat = await stat(entryPath);
      const isDir = entryStat.isDirectory();
      const entrySize = isDir ? await getDirSize(entryPath) : entryStat.size;
      children.push({
        name: entry,
        path: entryPath,
        size: entrySize,
        type: isDir ? 'data' : 'unknown',
        safeToRemove: false,
        modifiedAt: entryStat.mtimeMs,
      });
    }
  } catch { /* no permission or not a directory */ }
  return children;
}

export async function scanAllModules(): Promise<Record<ModuleId, ModuleScanResult>> {
  const moduleIds: ModuleId[] = ['brew', 'docker', 'npm', 'conda', 'system-cache', 'cli-tools', 'downloads'];
  const results: Partial<Record<ModuleId, ModuleScanResult>> = {};

  for (const id of moduleIds) {
    results[id] = await scanModule(id);
  }

  return results as Record<ModuleId, ModuleScanResult>;
}
