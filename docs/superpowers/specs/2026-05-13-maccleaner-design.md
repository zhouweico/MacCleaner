# MacCleaner — 磁盘清理 macOS APP 设计文档

> 日期: 2026-05-13
> 状态: 待审批

## 1. 产品定位

一款 macOS 磁盘清理 APP，覆盖包管理器缓存、开发工具版本、Docker、系统缓存、APP 卸载残留等多维度清理需求。弥补 App Cleaner 8 只能管 APP 卸载的局限性。

**定位**：个人工具起步，架构预留扩展为可发布产品。

## 2. 技术栈

- **框架**: Electron + TypeScript + React
- **构建**: Vite (前端) + electron-builder (打包)
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **权限**: macOS Full Disk Access（通过系统设置授予）

## 3. 应用架构

### 3.1 双形态

**菜单栏模式（轻量）**：
- 常驻菜单栏图标
- 弹出简洁面板：显示可清理空间、各模块占用、一键安全清理
- 入口按钮打开完整窗口

**完整窗口模式（深度管理）**：
- 左侧分类导航
- 右侧模块详情
- 支持设置页

### 3.2 左侧导航分区

```
┌─────────────────────────┐
│ 🧹 清理模块             │
│   🏠 仪表盘              │
│   🍺 Brew 缓存           │
│   🐳 Docker 清理         │
│   📦 npm/Node            │
│   🐍 Conda/Python        │
│   🗂️ 系统缓存            │
│   🛠️ CLI 工具            │
│   📥 Downloads           │
├─────────────────────────┤
│ 🗑️ 卸载管理             │
│   📱 已安装 APP          │
│   📦 CLI 工具卸载        │
│   🗑️ APP 残留清理        │
├─────────────────────────┤
│   ⚙️ 设置               │
└─────────────────────────┘
```

### 3.3 清理 vs 卸载

| 维度 | 🧹 清理 | 🗑️ 卸载 |
|------|---------|---------|
| 目标 | 软件保留，删无用数据 | 软件+关联文件全部删除 |
| 风险 | 低 | 高 |
| 颜色标识 | 🟢 绿色 | 🔴 红色 |
| 频率 | 经常（每日扫描） | 偶尔 |
| 确认方式 | 安全清理按钮直接执行 | 二次确认弹窗 + 选项 |

## 4. 清理模块

### 4.1 仪表盘（默认页）

- 顶部卡片：可清理总计 + 磁盘总容量/使用率
- 各模块水平进度条列表，点击跳转对应模块
- 快捷按钮：安全清理全部

### 4.2 Brew 缓存

**扫描内容**：
- `brew list` 已安装包
- 每个包的旧版本（`brew info <pkg>`）
- Homebrew 下载缓存 `~/Library/Caches/Homebrew`

**清理命令**：
- `brew cleanup` — 安全，删除旧版本
- `brew cleanup --prune=all` — 删除所有缓存

**UI 展示**：
- 三指标卡片：已安装包数、旧版本残留数、可清理空间
- 表格：包名 | 当前版本 | 旧版本列表 | 占用大小
- 安全清理按钮（绿色）

### 4.3 Docker 清理

**扫描内容**：
- `docker system df` 获取各类型占用
- Docker 隐藏目录：`~/.docker/`（配置）、`~/.orbstack/`（OrbStack 后端）
- 悬空镜像（dangling images）— 安全清理
- 停止的容器 — 高级清理
- 未使用 volume — 高级清理
- Build cache — 安全清理

**清理命令**：
- `docker image prune -f` — 仅悬空镜像（安全）
- `docker system prune -f` — 悬空镜像 + 停止容器 + 无用网络
- `docker system prune -a -f` — 全部未使用镜像
- `docker volume prune -f` — 未使用 volume

**UI 展示**：
- 四指标卡片：悬空镜像数、停止容器数、未使用 volume 数、build cache 大小
- 表格带复选框，分安全/高级两色标识
- 两个按钮：安全清理（绿色）+ 高级清理（橙色，需勾选）

### 4.4 npm / Node.js

**扫描内容**：
- nvm 管理的 Node 版本列表（`~/.nvm/versions/node/`），标记当前版本
- npm cache（`~/.npm/`，通常 1-2GB）
- npm global 包列表

**清理命令**：
- `npm cache clean --force`
- nvm 卸载旧版本：`nvm uninstall <version>`

**UI 展示**：
- Node 版本列表（当前版本高亮，旧版本可勾选卸载）
- npm cache 大小 + 一键清理按钮

### 4.5 Conda / Python

**扫描内容**：
- conda 环境列表（`~/.conda/envs/` + miniconda3/envs/），标记当前激活环境
- pip cache（`~/Library/Caches/pip` + `~/.cache/pip/`）
- conda 包缓存（`~/.conda/pkgs/`）

**清理命令**：
- `conda env remove -n <name>`
- `conda clean --all -y`
- `pip cache purge`

**UI 展示**：
- 环境列表（base/当前高亮，废弃环境可勾选删除）
- 缓存大小 + 清理按钮

### 4.6 系统缓存

**扫描内容**：
- `~/Library/Caches` 下各子目录大小
- `~/Library/Logs` 日志文件
- `~/.cache/` 下的跨平台缓存（1.2GB）

**清理规则**：
- 缓存目录可安全删除（应用会自动重建）
- 日志文件可安全删除
- 排除特定关键目录（Keychain、TouchID 等）

**UI 展示**：
- 按大小排序的缓存目录列表
- 可展开查看具体文件
- 勾选批量删除
- 提示：缓存删除后应用会重建，不影响数据

### 4.7 CLI 工具

**扫描内容**：
- 已安装的 CLI 工具列表（claude、codex、opencode、gh 等）
- 各工具的隐藏目录缓存：
  - `~/.claude/`（Claude Code 配置和会话）
  - `~/.codex/`（Codex 会话缓存，~158MB）
  - `~/.qwen/`（Qwen CLI 配置）
  - `~/.kube/`（k8s 配置，~250MB）
  - `~/.krew/`、`~/.kubecm/` 等 k8s 插件
  - `~/.lark-cli/`（飞书 CLI 配置）
  - `~/.folo/`（Folo RSS 配置）

**清理命令**：
- 各工具自带的 cache clean 命令
- 旧版本卸载（如 npx 缓存）

**UI 展示**：
- 工具列表 + 版本 + 缓存大小 + 隐藏目录路径
- 一键清理缓存

### 4.8 Downloads

**扫描内容**：
- `~/Downloads` 下文件（含子目录），支持按名称/大小/日期排序

**清理方式**：
- 勾选文件或目录后移至废纸篓（非永久删除，通过 `shell.trashItem`）

**UI 展示**：
- 文件列表支持排序（名称 ↑↓、大小 ↑↓、日期 ↑↓）
- 全选/反选复选框
- 选中多项时显示 SelectionSummary 汇总
- 详情面板展示文件夹子项（CollapsibleFileSection 可折叠）
- 搜索定位高亮 + 自动滚动

> 注：废纸篓清理使用 macOS 系统原生功能，不在此模块提供清空按钮。

## 5. 卸载模块

### 5.1 已安装 APP 卸载

**扫描内容**：
- `/Applications` 下所有 .app
- 关联文件扫描：
  - `~/Library/Application Support/<bundle_id>/`
  - `~/Library/Preferences/<bundle_id>.plist`
  - `~/Library/Caches/<bundle_id>/`
  - `~/Library/Containers/<bundle_id>/`
  - `~/Library/Saved Application State/<bundle_id>.savedState/`
  - `~/Library/WebKit/<bundle_id>/`
  - `/usr/local/bin/<name>`（命令行链接）
  - **隐藏目录关联**：`~/.<appname>/`、`~/.config/<appname>/`（通过 bundle_id 和 app 名称匹配）

**隐藏目录处理策略**：
- 卸载 APP 时，通过 **名称变体匹配** + **bundle_id 推导工具名** 扫描 `~/.xxx` 目录
- 名称变体生成：去除空格、替换为 `-`/`_`、移除版本号
- bundle_id 推导：提取最后一段（如 `com.microsoft.VSCode` → `vscode`）
- `~/.config/` 子目录单独扫描
- 已知隐藏目录字典（`known-hidden-dirs.json`）用于识别工具目录
- `~/.ssh/`、`~/.gnupg/` 等安全目录永远排除

**卸载流程**：
1. 选择要卸载的 APP
2. 展示 APP 本体 + 所有关联文件列表（含 `~/.xxx` 隐藏目录）
3. 弹窗选项：
   - **保留用户数据**（默认）：保留 `~/Documents`、`~/Library/Application Support`、`~/.xxx` 中的用户数据目录
   - **完全清除**：删除所有关联文件（含隐藏目录）
4. 二次确认后执行

**UI 展示**：
- APP 列表（图标 + 名称 + 大小 + 关联文件数量）
- 搜索/过滤
- 点击展开详情面板（分组展示：APP 本体、Library 文件、**隐藏目录**）
- 卸载按钮（红色）+ 弹窗选择

### 5.2 CLI 工具卸载

**扫描内容**：
- npm global 包 + 关联的 `~/.npm/` 缓存
- brew 安装的 CLI 工具 + 关联的 `~/.config/` 配置
- pip global 包 + 关联的 `~/.cache/pip/` 缓存
- CLI 工具的专属隐藏目录（如 `~/.kube/`、`~/.docker/` 等）

**卸载流程**：
- 选择工具 → 展示安装位置 + 关联隐藏目录 → 执行对应卸载命令

**隐藏目录处理策略**：
- 卸载 CLI 工具时，展示该工具关联的所有隐藏目录
- 例如卸载 kubectl 时，提示 `~/.kube/config` 将被保留或清除
- 例如卸载 Docker CLI 时，提示 `~/.docker/config.json` 将被处理
- 默认保留配置文件（config、credentials 类），清理缓存类（cache、sessions 类）

**UI 展示**：
- 工具列表 + 安装来源 + 版本 + 关联隐藏目录数
- 一键卸载 + 弹窗选择（保留配置/完全清除）

### 5.3 APP 残留清理

**扫描内容**：
- 遍历 `~/Library` 下所有 plist/support/cache 目录
- 遍历 `~/.xxx` 隐藏目录（`~/.cache/`、`~/.config/` 下的子目录）
- 检查关联的 .app 是否仍然存在
- 标记已卸载 APP 的残留文件

**隐藏目录扫描策略**：
- `~/.xxx` 目录按 **最后修改时间** 排序，超过 7 天未访问的优先标记
- 已知工具目录直接排除（`known-hidden-dirs.json` 中的 config/data 类）
- 保护目录（`.ssh`、`.gnupg`、`.keychain` 等）永远排除
- 未知目录通过文件名模式匹配已知 APP 名称
- 仅展示 > 1MB 的未知目录，避免噪音

**UI 展示**：
- 残留 APP 名称列表 + 残留文件大小（分组：Library 残留 + **隐藏目录残留**）
- 一键清理残留

## 6. AI 增强分析（可选功能）

### 6.1 设计原则

- **默认规则引擎**：离线可用、零成本、即时响应
- **AI 作为可选项**：用户在设置中开启，默认关闭
- **双模型支持**：本地 Ollama（离线/免费）或云端 Claude API（高精度/需 Key）

### 6.2 AI 能力场景

| 场景 | 规则引擎表现 | AI 增强表现 |
|------|-------------|------------|
| **未知目录推断** | 按命名和子目录结构猜测，准确率 ~60% | 分析完整目录特征，准确率 ~90%+ |
| **残留关联匹配** | 名称模糊匹配，漏判率高 | 理解 APP 变体、bundle_id 规律、历史知识 |
| **用户决策辅助** | 静态提示文本 | 交互式对话，解释目录内容、风险评估 |
| **新工具识别** | 需手动更新字典 | 自动识别并生成清理规则 |
| **清理建议生成** | 固定模板 | 根据用户实际使用模式定制建议 |

### 6.3 用户设置

```
⚙️ 设置 > 定时扫描
├── 启用每日自动扫描  [开关]
└── 扫描时间  [09:00]

️ 设置 > AI 增强分析
── 启用 AI 分析  [开关]
└── Ollama 地址  [输入框]  [测试连接]

⚙️ 设置 > 快捷键
├── 全选  A  [开关]
└── 重新扫描  ⌘R  [开关]

⚙️ 设置 > 操作日志
── 刷新  [按钮]
└── 清空  [按钮]
```

> **实时保存**：所有设置项切换后立即写入 `localStorage`，无需"保存"按钮。定时扫描切换时同步注册/停止定时器。

### 6.4 AI 实现架构

- **规则引擎兜底**：AI 不可用时（Ollama 未启动/连接失败），自动切换到规则引擎分析
- **已知工具字典**：内置 Claude、Codex、Qwen、Kubernetes、Docker、NVM、Conda、npm 等工具识别
- **关键词匹配**：cache/config/data/logs 等关键词分类
- **流式调用**：通过 `curl` 调用 Ollama `/api/generate`，`stream: false` 模式
- **JSON 解析**：AI 返回 JSON 格式分析结果（software、category、safeToDelete、riskLevel、description、recommendedAction）

### 6.5 AI Prompt 设计

**未知目录分析 Prompt**：
```
你是一个 macOS 系统分析助手。请分析以下目录的用途：

目录路径: ~/.xxx
目录大小: 1.2GB
内部结构: [列出前 20 个文件和子目录]
修改时间: 2026-05-10

请回答：
1. 这个目录最可能属于哪个软件/工具？
2. 它是缓存、配置、数据还是日志？
3. 删除是否安全？有什么风险？
4. 推荐的清理命令是什么？
```

**卸载关联扫描 Prompt**：
```
以下 APP 已被用户卸载：App Cleaner 8
请根据 macOS 的常见惯例，推断该 APP 可能留下的关联文件位置：

已知已扫描位置：
- ~/Library/Application Support/com.appcleaner/
- ~/Library/Preferences/com.appcleaner.plist

请列出可能遗漏的位置，特别是隐藏目录。
```

### 6.6 成本控制

- AI 调用仅在用户**主动触发**时发生（点击「AI 分析」按钮）
- 分析结果不缓存，每次手动触发重新分析
- 本地 Ollama 无 API 成本，仅需首次下载模型（~4GB）
- 设置页提供「测试连接」按钮，验证 Ollama 服务可用性
- AI 不可用时自动回退到规则引擎，零成本兜底

## 7. 隐藏目录分类表

以下是你的 Mac 上常见的 `~/.xxx` 目录分类：

### 可安全清理（缓存类）
| 目录 | 说明 | 大小 |
|------|------|------|
| `~/.npm/` | npm 包缓存 | 1.2GB |
| `~/.cache/` | 跨平台应用缓存 | 1.2GB |
| `~/.cocoapods/` | CocoaPods 缓存 | 172KB |
| `~/.gem/` | Ruby gem 缓存 | - |

### 配置类（卸载时需询问）
| 目录 | 说明 | 大小 |
|------|------|------|
| `~/.claude/` | Claude Code 配置/会话 | 30MB |
| `~/.codex/` | Codex 会话缓存 | 158MB |
| `~/.qwen/` | Qwen CLI 配置 | - |
| `~/.kube/` | k8s 配置 | 250MB |
| `~/.docker/` | Docker 配置 | 3.4MB |
| `~/.config/` | XDG 标准配置 | 6.6MB |
| `~/.ssh/` | SSH 密钥（排除） | ⛔ 不可删 |
| `~/.vim/` | Vim 配置 | - |

### 工具数据类（按工具生命周期管理）
| 目录 | 说明 | 大小 |
|------|------|------|
| `~/.orbstack/` | OrbStack 数据 | 88KB |
| `~/.krew/` | kubectl 插件 | - |
| `~/.folo/` | Folo RSS 数据 | - |
| `~/.lark-cli/` | 飞书 CLI | - |
| `~/.local/` | XDG 标准数据 | 189MB |

### ⛔ 系统/安全目录（永远不可删）
| 目录 | 说明 |
|------|------|
| `~/.ssh/` | SSH 密钥和 known_hosts |
| `~/.Trash/` | 废纸篓（需用户手动清空） |

## 8. 自动化

- **每日定时扫描**：每天固定时间（可配置）执行一次全量扫描
- 扫描结果缓存，下次打开 APP 时直接展示
- 菜单栏显示最新扫描结果的可清理空间
- **持久化配置**：定时配置保存在 `dist-electron/data/schedule.json`，重启后自动恢复
- **防重复触发**：同一分钟内只执行一次，执行后自动重新启用次日扫描
- **支持停止**：关闭定时开关后清除定时器并更新配置

## 9. 安全策略

### 9.1 操作日志

- 所有清理、卸载操作自动记录日志
- **UI 展示**（设置页）：
  - 第一行：左侧文件/目录路径 · 右侧 成功/失败
  - 第二行：左侧图标+类型 · 右侧日期时间
  - 额外信息：释放空间、详情、错误信息在下方独立展示
- 最多保留 200 条记录，超出自动清理旧条目
- 持久化到 `dist-electron/data/operation-log.json`
- 设置页可查看、刷新、清空日志

### 9.2 混合清理模式

| 级别 | 按钮颜色 | 行为 | 示例 |
|------|----------|------|------|
| **安全清理** | 🟢 绿色 | 自动判断无风险项，一键执行 | 缓存、旧版本、悬空镜像 |
| **高级清理** | 🟠 橙色 | 展示列表，用户勾选确认后执行 | Docker 容器/volume、Conda 环境 |

### 卸载二次确认

卸载操作必须弹窗确认：
1. 选择「保留用户数据」或「完全清除」
2. 确认文件列表（含隐藏目录）
3. 执行删除

### 通用保护

- 所有卸载/高级清理操作可撤销（移至废纸篓而非直接删除）
- 操作日志记录（可在设置中查看）
- 危险操作排除列表（系统关键目录不可删）
- 使用 `execFile` 执行命令，避免 shell 注入
- **隐藏目录保护**：`~/.ssh/`、`~/.gnupg/`、`~/.keychain/` 等安全目录永远不可标记删除

## 10. 目录结构

```
cleaner/
├── package.json
├── electron/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts           # 预加载脚本
│   └── ipc/                  # IPC 通信 handlers
│       ├── scan.ts           # 扫描逻辑
│       ├── clean.ts          # 清理逻辑
│       ├── uninstall.ts      # 卸载逻辑
│       └── schedule.ts       # 定时任务
├── src/                      # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Sidebar.tsx       # 左侧导航
│   │   ├── MenuBar.tsx       # 菜单栏面板
│   │   ├── Dashboard.tsx     # 仪表盘
│   │   ├── ModuleView.tsx    # 模块通用视图
│   │   ├── UninstallView.tsx # 卸载视图
│   │   └── SettingsView.tsx  # 设置页
│   ├── modules/              # 各模块组件
│   │   ├── BrewModule.tsx
│   │   ├── DockerModule.tsx
│   │   ├── NpmModule.tsx
│   │   ├── CondaModule.tsx
│   │   ├── SystemCacheModule.tsx
│   │   ├── CliToolsModule.tsx
│   │   └── DownloadsModule.tsx
│   ├── features/             # AI 增强功能
│   │   └── aiAnalyzer.ts     # AI 目录分析
│   ├── hooks/                # 自定义 hooks
│   │   ├── useScan.ts
│   │   ├── useClean.ts
│   │   └── useUninstall.ts
│   ├── store/                # Zustand 状态
│   │   └── index.ts
│   └── lib/                  # 工具函数
│       ├── fs-utils.ts       # 文件扫描、目录大小计算
│       ├── exec.ts           # 命令执行（execFile 封装）
│       └── hidden-dirs.ts    # 隐藏目录识别与分类
├── electron/
│   └── data/
│       └── known-hidden-dirs.json  # 已知隐藏目录映射表
├── resources/
│   └── icon.icns
└── electron-builder.json
```

## 11. IPC 通信协议

主进程暴露以下 IPC channels：

| Channel | 方向 | 描述 |
|---------|------|------|
| `scan:module` | renderer → main | 扫描指定模块 |
| `scan:all` | renderer → main | 全量扫描 |
| `scan:hidden-dirs` | renderer → main | 扫描隐藏目录 |
| `clean:safe` | renderer → main | 执行安全清理 |
| `clean:advanced` | renderer → main | 执行高级清理（带参数） |
| `uninstall:app` | renderer → main | 卸载 APP |
| `uninstall:cli` | renderer → main | 卸载 CLI 工具 |
| `scan:residual` | renderer → main | 扫描 APP 残留（含隐藏目录） |
| `schedule:register` | renderer → main | 注册定时任务 |
| `schedule:stop` | renderer → main | 停止定时任务 |
| `logs:get` | renderer → main | 获取操作日志 |
| `logs:clear` | renderer → main | 清空操作日志 |
| `events:progress` | main → renderer | 清理/扫描进度更新 |
| `events:complete` | main → renderer | 操作完成通知 |
| `events:error` | main → renderer | 错误通知 |

## 13. 已实现的增强功能（超出原始设计）

### 13.1 三栏布局

原始设计为左侧导航 + 右侧内容两栏布局。实际实现采用 **三栏布局**：
- 左侧：分类导航 Sidebar
- 中部：模块列表视图（ListDetailLayout）
- 右侧：详情面板（可选展开）

### 13.2 全局键盘快捷键

实现 `useKeyboardShortcuts` hook，支持：
- `Cmd+R` — 重新扫描（受设置开关控制）
- `Cmd+1~9` — 快速切换导航项
- `Cmd+W` — 隐藏窗口（非关闭）
- `Escape` — 返回仪表盘

### 13.3 Finder 图标集成

实现 `FinderIcon` 组件，从 `.app` bundle 中提取并渲染原生 macOS 应用图标，用于：
- APP 卸载列表显示真实图标
- 已安装 APP 卡片展示

### 13.4 面板双向通信

Tray 弹出面板与主窗口之间实现完整双向数据同步：
- 面板清理后 → 通过 `panel:refresh` IPC → 主窗口 `events:refresh` 事件 → 主窗口重新扫描
- 主窗口导航 → 通过 `navigate:module` IPC → 面板切换模块
- 面板刷新按钮 → `onMouseDown + preventDefault` 阻止 blur 隐藏

### 13.5 自动隐藏滚动条

实现 `AutoHideScroll` 组件，在列表容器中提供 macOS 风格的自动隐藏滚动条，提升面板和列表的视觉简洁度。

### 13.6 可折叠文件列表

实现 `CollapsibleFileSection` 组件，支持展开/收起大文件列表，避免单次展示过多内容。

### 13.7 选择摘要

实现 `SelectionSummary` 组件，在多选列表中显示已选项目的数量、总大小，提升批量操作的可视化反馈。

### 13.8 错误边界

实现 `ErrorBoundary` 组件，捕获渲染树中的错误，防止单个模块错误导致整个应用崩溃。

### 13.9 布局包装器

实现 `LayoutWrapper` 组件，统一管理模块视图的布局、加载状态和空状态展示。

### 13.10 图标资源管理

- 新增 `extractAppIcon.ts` 工具函数，从 `.app` bundle 中提取图标
- Tray 图标使用 `resources/extension_icon.png`，自适应深色/浅色菜单栏
- 打包配置包含 `resources/` 目录

### 13.11 窗口行为优化

- 主窗口关闭时隐藏到 Tray（非退出），`willQuit` 标记控制真正退出
- 单实例锁（`requestSingleInstanceLock`），防止多开
- 开发模式自动打开 DevTools，生产模式关闭
- 拦截 Cmd+R，根据设置决定是否允许刷新
- Panel 窗口失焦自动隐藏（`blur` 事件）

### 13.12 菜单栏弹窗快捷键

弹窗底部 4 个按钮支持 ⌘ 组合快捷键：

| 快捷键 | 按钮 | 功能 |
|--------|------|------|
| `⌘R` | 刷新 | 重新扫描数据 |
| `⌘O` | 打开 | 打开主窗口 |
| `⌘,` | 设置 | 打开主窗口并跳到设置页 |
| `⌘Q` | 退出 | 退出应用 |

### 13.13 关于面板

单入口：macOS 顶部菜单栏 **"MacCleaner"** → **"关于 MacCleaner"**（通过自定义 Application Menu 拦截）。
Tray 图标已移除右键菜单。

**窗口**：独立 `BrowserWindow`，`titleBarStyle: 'hidden'`（保留红绿灯按钮），`-webkit-app-region: drag` 支持拖拽。

**图标方案**：`nativeImage.createFromPath()` 对 `.icns` 支持不完整，先用 `sips -s format png` 转为 PNG 再读取 `toDataURL()`。

**弹窗内容**：
- 应用图标（84×84，圆角）
- 应用名称（大字加粗）
- 版本号（独立行）
- 组件版本列表（独立行排列）：
  - Electron
  - Node.js
  - Chromium
  - V8
- 版权信息（底部）

**交互**：
- macOS 原生红绿灯关闭按钮
- 窗口可拖拽
- 不可拖拽（关闭按钮可拖拽区域外）
- 深色主题，与应用设计语言一致
