import { execFileNoThrow } from '../utils/execFileNoThrow';
import type { ModuleId, CleanResult, CleanAction } from '../types';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';

export async function safeClean(moduleId: ModuleId): Promise<CleanResult> {
  const cleaners: Record<ModuleId, () => Promise<CleanResult>> = {
    brew: cleanBrew,
    docker: cleanDocker,
    npm: cleanNpm,
    conda: cleanConda,
    'system-cache': cleanSystemCache,
    'cli-tools': () => Promise.resolve({ success: true, freedSpace: 0, errors: [] }),
    downloads: () => Promise.resolve({ success: true, freedSpace: 0, errors: [] }),
  };

  return cleaners[moduleId]();
}

export async function advancedClean(_moduleId: ModuleId, actions: CleanAction[]): Promise<CleanResult> {
  let freedSpace = 0;
  const errors: string[] = [];

  for (const action of actions) {
    if (action.command && action.commandArgs) {
      const { stderr } = await execFileNoThrow(action.command, action.commandArgs);
      if (stderr && !stderr.includes('No such')) {
        errors.push(stderr);
      }
    } else if (action.path && existsSync(action.path)) {
      try {
        await rm(action.path, { recursive: true, force: true });
        freedSpace += action.size;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  return { success: errors.length === 0, freedSpace, errors };
}

async function cleanBrew(): Promise<CleanResult> {
  const { stderr } = await execFileNoThrow('brew', ['cleanup']);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}

async function cleanDocker(): Promise<CleanResult> {
  const { stderr } = await execFileNoThrow('docker', ['image', 'prune', '-f']);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}

async function cleanNpm(): Promise<CleanResult> {
  const { stderr } = await execFileNoThrow('npm', ['cache', 'clean', '--force']);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}

async function cleanConda(): Promise<CleanResult> {
  const { stderr } = await execFileNoThrow('conda', ['clean', '--all', '-y']);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}

async function cleanSystemCache(): Promise<CleanResult> {
  return { success: true, freedSpace: 0, errors: [] };
}
