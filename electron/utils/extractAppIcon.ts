import { existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { join, basename } from 'path';
import { execFileNoThrow } from './execFileNoThrow';
import { tmpdir } from 'os';

export async function extractAppIcon(appPath: string): Promise<string | undefined> {
  try {
    const contentsDir = join(appPath, 'Contents');
    const resourcesDir = join(contentsDir, 'Resources');

    // 从 Info.plist 获取图标文件名
    const plistPath = join(contentsDir, 'Info.plist');
    let iconFile: string | undefined;
    if (existsSync(plistPath)) {
      const { stdout } = await execFileNoThrow('defaults', ['read', plistPath, 'CFBundleIconFile']);
      const raw = stdout.trim();
      iconFile = raw || undefined;
    }

    // 默认图标
    if (!iconFile) iconFile = 'AppIcon';

    // 添加 .icns 后缀
    if (!iconFile.endsWith('.icns')) iconFile += '.icns';

    const icnsPath = join(resourcesDir, iconFile);
    if (!existsSync(icnsPath)) return undefined;

    // sips 转换为 PNG
    const pngPath = join(tmpdir(), `icon-${Date.now()}-${basename(appPath, '.app')}.png`);
    await execFileNoThrow('sips', ['-s', 'format', 'png', '--out', pngPath, icnsPath]);

    // 读取为 base64
    const pngData = await readFile(pngPath);
    const base64 = pngData.toString('base64');

    // 清理临时文件
    await unlink(pngPath);

    return `data:image/png;base64,${base64}`;
  } catch {
    return undefined;
  }
}
