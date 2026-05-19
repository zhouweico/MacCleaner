# MacCleaner

macOS 深度磁盘清理与 APP 卸载工具。覆盖包管理器缓存、开发工具版本、Docker、系统缓存、APP 卸载残留等多维度清理需求。

## ✨ 功能特性

### 🧹 清理模块

| 模块 | 说明 |
|------|------|
| **仪表盘** | 可清理空间总览 + 各模块进度条 |
| **Homebrew** | 已安装包、旧版本残留、缓存清理 |
| **Docker** | 悬空镜像、停止容器、未使用 volume、build cache |
| **npm/Node** | Node 版本管理、npm 缓存清理 |
| **Conda** | Python 环境管理、pip/conda 缓存清理 |
| **系统缓存** | `~/Library/Caches` 目录扫描与清理 |
| **CLI 工具** | Claude、Codex、kubectl 等工具缓存目录识别 |
| **Downloads** | 下载目录文件管理、移至废纸篓 |

### ️ 卸载模块

| 模块 | 说明 |
|------|------|
| **应用程序卸载** | APP + 关联文件（Library + 隐藏目录 `~/.xxx`）完整扫描 |
| **CLI 工具卸载** | 按安装来源（brew/npm）执行对应卸载命令 |
| **残留清理** | 已卸载 APP 的 Library 残留 + 隐藏目录残留扫描 |

### ⚡ 其他功能

- **双形态界面**：菜单栏弹出面板 + 完整窗口模式
- **AI 增强分析**：本地 Ollama 模型识别未知目录（可选）
- **定时扫描**：每日自动扫描，cron 表达式配置
- **自动更新**：基于 GitHub Releases，启动时自动检查
- **操作日志**：所有清理/卸载操作记录，最多保留 200 条
- **全局快捷键**：`Cmd+R` 重新扫描、`Cmd+1~9` 快速切换模块
- **macOS 深色主题**：原生系统设置风格 UI

## 🚀 安装

### 从 GitHub Release 下载

访问 [Releases 页面](https://github.com/zhouweico/MacCleaner/releases) 下载最新版本。

### 系统要求

- macOS 12+（Monterey 及以上）
- 首次运行需在 **系统设置 → 隐私与安全性 → 完全磁盘访问权限** 中授予权限

## 🛠️ 开发

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动后自动打开主窗口（`http://localhost:5173`），DevTools 自动开启。

### 构建

```bash
npm run build:mac
```

输出目录：`out/`

| 文件 | 说明 |
|------|------|
| `MacCleaner-{version}.dmg` | 安装镜像 |
| `MacCleaner-{version}-mac.zip` | 自动更新包（Squirrel.Mac） |
| `latest-mac.yml` | 版本元数据 |

### 发布

```bash
# 1. 更新 package.json 中的 version
# 2. 提交代码
git add . && git commit -m "chore: 升级版本至 x.y.z"

# 3. 打标签并推送
git tag vx.y.z && git push origin vx.y.z

# 4. 构建并创建 Release
npm run build:mac
gh release create vx.y.z \
  out/MacCleaner-{version}.dmg \
  out/MacCleaner-{version}-mac.zip \
  out/latest-mac.yml \
  --title "MacCleaner vx.y.z" \
  --notes "发布说明"
```

##  项目结构

```
cleaner/
── electron/          # 主进程代码
│   ├── main.ts        # 应用入口
│   ├── ipc/           # IPC handlers
│   └── services/      # 后端服务（扫描、清理、卸载等）
├── src/               # 渲染进程代码
│   ├── components/    # UI 组件
│   ├── modules/       # 清理模块页面
│   ├── features/      # 卸载模块页面 + AI 分析
│   ├── store/         # Zustand 状态管理
│   ├── hooks/         # 自定义 hooks
│   └── lib/           # 工具函数 + IPC 封装
├── resources/         # 图标资源
├── docs/              # 设计文档
└── electron-builder.json
```

##  技术栈

| 技术 | 版本 |
|------|------|
| Electron | 33.x |
| React | 19.x |
| TypeScript | 5.6+ |
| Vite | 6.x |
| Tailwind CSS | 3.4+ |
| Zustand | 5.x |
| electron-updater | 6.8+ |
| electron-builder | 25.x |

## 📝 许可证

MIT
