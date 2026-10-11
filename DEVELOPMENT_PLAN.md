# Markdown 阅读器 — 开发计划

> **纯客户端桌面软件**（Electron），直接读写本地文件系统，无服务端。
> 核心功能：本地文件/文件夹管理与渲染、全文搜索、目录树导航。
> 版本范围：v1.0 单机桌面应用（Windows 优先，兼顾 Mac）。

---

## 1. 总体架构

Electron 的主进程 / 渲染进程分离，文件系统访问全部在主进程完成，渲染进程通过 IPC 调用，保证安全（渲染进程不直接接触 Node API）。

```
┌──────────────────────── Electron 应用 ────────────────────────┐
│  Renderer (渲染进程 / UI)            Main (主进程 / Node)       │
│  ┌────────────┐ ┌────────────┐      ┌──────────────────────┐  │
│  │ 目录树     │ │ 渲染/预览   │ IPC→ │ 文件读取 (fs)         │  │
│  │ 搜索面板   │ │ 大纲(TOC)   │      │ 文件夹监听 (chokidar) │  │
│  └────────────┘ └────────────┘      │ 搜索索引 (本地)       │  │
│         contextBridge (preload)      │ 窗口/菜单/最近打开    │  │
└───────────────────────────────────────────────────────────────┘
                          ▼
                   本地文件系统 (.md 文件)
```

**关键设计决策**
- **安全模型**：`contextIsolation: true` + `nodeIntegration: false`，渲染进程通过 `preload` 暴露的白名单 API（contextBridge）操作文件，杜绝任意 Node 调用。
- **工作区概念**：用户“打开文件夹”作为工作区根目录，目录树、搜索都基于该根目录；最近打开列表持久化。
- **渲染**：客户端用 `markdown-it` 渲染，本地高亮，无网络依赖。
- **搜索**：渲染进程不扫盘；由主进程遍历工作区构建内存/磁盘索引，支持文件名 + 全文。
- **配置/状态**：用 `electron-store` 持久化窗口大小、主题、最近文件、设置。

---

## 2. 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 应用框架 | Electron + Vite (electron-vite) | 主/渲染/preload 三端构建 |
| UI | Vue 3 + TypeScript + Pinia | 组件化 + 状态管理 |
| 渲染 | markdown-it + highlight.js | 表格/任务列表/脚注/数学公式等插件 |
| 文件监听 | chokidar | 外部修改自动刷新目录树/内容 |
| 本地存储 | electron-store | 配置与最近打开 |
| 测试 | Vitest（渲染层）+ Playwright（E2E，可选） | |
| 打包 | electron-builder | Windows NSIS / Mac dmg |

---

## 3. IPC 接口设计（主进程 ↔ 渲染进程）

通过 preload 的 contextBridge 暴露 `window.api`：

| 通道 | 功能 |
|---|---|
| `dialog:openFolder` | 弹出选择文件夹，返回工作区根路径 |
| `fs:readTree` | 读取目录树（懒加载，按需展开子目录） |
| `fs:readFile` | 读取文件内容 |
| `fs:create` | 新建文件/文件夹 |
| `fs:delete` | 删除（移入回收站，用 `shell.trashItem`） |
| `fs:rename` | 重命名/移动 |
| `search:query` | 全文/文件名搜索，返回命中 + 摘要 |
| `watch:changed`（事件） | 文件系统变更推送给渲染进程 |
| `store:get` / `store:set` | 读写配置 |

**安全要点**：所有路径在主进程内规范化并校验落在工作区根目录内；删除走系统回收站而非物理删除，降低误删风险。

---

## 4. 里程碑与阶段拆解

### M0 — 项目脚手架（约 1.5 天）✅
- [x] electron-vite + Vue3 + TS 初始化，跑通空白窗口
- [x] 主/preload/渲染三端结构与 contextBridge 通路
- [x] 一个最小 IPC（如 `app:version`）联调成功
- [x] 基础布局：左侧栏 + 主区 + 状态栏

### M1 — 文件管理与目录树（约 3 天）✅
- [x] 打开文件夹（工作区）+ 最近打开列表（electron-store 持久化）
- [x] 目录树组件：懒加载、展开/折叠、图标、右键菜单
- [x] 文件操作：新建/删除(回收站 `shell.trashItem`)/重命名/移动（move IPC 已就绪，拖拽移动 UI 待 M4 打磨）
- [x] chokidar 监听外部变更并刷新

### M2 — Markdown 渲染与阅读（约 3 天）✅
- [x] markdown-it 集成 + highlight.js 代码高亮 + 插件（表格/任务列表/脚注/KaTeX 数学）
- [x] 阅读视图 + TOC 大纲生成与点击跳转
- [x] 本地图片/相对链接解析（自定义 `mdreader://` 安全协议，仅服务工作区内文件）
- [x] 明/暗主题切换（system/light/dark，electron-store 持久化）

### M3 — 搜索（约 2.5 天）✅
- [x] 主进程工作区索引（文件名 + 全文），chokidar add/change/unlink 增量更新
- [x] 搜索面板：防抖关键字、结果按文件分组、摘要高亮（侧栏文件/搜索切换）
- [x] 命中跳转并在预览中定位高亮（TreeWalker 标记 + 滚动定位）

### M4 — 打包（约 0.5 天）✅
- [x] electron-builder 打包 Windows 安装包（NSIS）—— `npm run build:win` 产出 `dist/Markdown Reader-<version>-setup.exe`

> 合计约 **1.5 周**（单人，含联调缓冲）。M1 与 M2 可部分并行。

---

## 5. 目录结构建议

```
MarkdownReader/
├── electron/
│   ├── main/              # 主进程：文件、监听、搜索、窗口、菜单
│   ├── preload/           # contextBridge 暴露的白名单 API
│   └── ipc/               # IPC handler 按域拆分 (fs/search/store)
├── src/                   # 渲染进程 (Vue)
│   ├── components/        # 目录树、预览、搜索、大纲
│   ├── stores/            # Pinia：工作区、当前文件、设置
│   ├── composables/       # 渲染、快捷键
│   └── api/               # 对 window.api 的封装
├── resources/             # 图标等
├── electron.vite.config.ts
├── package.json
└── DEVELOPMENT_PLAN.md
```

---

## 6. 关键风险与对策

| 风险 | 对策 |
|---|---|
| 渲染进程任意访问文件系统 | contextIsolation + preload 白名单 API，路径边界校验 |
| 误删文件 | 删除走系统回收站 `shell.trashItem` |
| 大目录/大文件卡顿 | 目录树懒加载、搜索分页/限流 |
| 本地图片/相对路径失效 | 主进程解析为安全 `file://` 或自定义协议 |
| 打包体积与启动速度 | 按需引入插件，生产构建裁剪 |

---

## 7. 后续可扩展（v2+，本期不做）
- 导出 PDF / HTML、打印
- 图床 / 附件管理、粘贴图片自动保存
- 文档版本历史与 diff
- 多标签页、分屏多文档
- 插件系统 / 自定义主题
- AI 摘要与问答（接入 Claude API）

---

## 8. 下一步
建议从 **M0 脚手架**开始。确认本计划后，我可以直接生成：
1. electron-vite + Vue3 + TS 项目骨架（含三端结构与 contextBridge 通路）
2. 基础三栏布局 + 打开文件夹的最小闭环
3. 目录树读取的首个可运行 IPC
