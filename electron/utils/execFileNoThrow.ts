import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function execFileNoThrow(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {},
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      maxBuffer: 100 * 1024 * 1024,
      timeout: options.timeout ?? 30000,
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { stdout: '', stderr: `命令未找到: ${command}`, exitCode: 127 };
    }
    const stderr = error instanceof Error ? error.message : String(error);
    return { stdout: '', stderr, exitCode: 1 };
  }
}
