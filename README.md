# Markdown Reader

纯客户端的 Markdown 阅读器，基于 Electron + Vue 3 + TypeScript。直接读写本地文件系统，**无服务端、无网络依赖**。

打开一个文件夹作为「工作区」，即可在目录树中浏览、搜索、阅读其中的 Markdown 文档。

## 功能特性

**阅读**

- `markdown-it` 渲染，支持表格、任务列表、脚注、代码高亮（highlight.js）与 KaTeX 数学公式
- 大纲（TOC）面板，点击标题跳转到正文对应位置
- 文内查找：命中高亮 + 上一条/下一条定位
- 明/暗主题（跟随系统 / 浅色 / 深色），状态栏一键切换

**文件管理**

- 工作区目录树，子目录懒加载
- 新建 / 重命名 / 移动 / 删除文件与文件夹（**删除走系统回收站**，不物理删除）
- 右键菜单操作
- `chokidar` 监听外部变更，目录树自动刷新；当前文档被外部修改时弹窗提示

**搜索**

- 主进程维护工作区索引（文件名 + 全文），监听变更增量更新
- 搜索面板：防抖输入、结果按文件分组、摘要命中高亮
- 点击结果跳转并在正文中定位高亮

**打开方式**

- Windows 安装时注册 `.md` / `.markdown` 文件关联，双击或「打开方式」直接打开
- 拖拽 `.md` 文件到窗口即可打开，并自动定位其所在目录
- 最近打开的工作区列表，可单独移除

## 技术栈

| 层 | 选型 |
| --- | --- |
| 应用框架 | Electron 42 + electron-vite 5（主 / preload / 渲染三端构建） |
| UI | Vue 3 + TypeScript 6 + Pinia |
| Markdown 渲染 | markdown-it + highlight.js + KaTeX（表格 / 任务列表 / 脚注 / 锚点插件） |
| 文件监听 | chokidar |
| 本地存储 | electron-store（主题、最近打开、窗口尺寸） |
| 打包 | electron-builder（Windows NSIS） |

## 快速开始

需要 **Node.js ≥ 20.19**（Vite 7 的要求）。

```bash
git clone https://github.com/liangchao2018/MarkdownReader.git
cd MarkdownReader
npm install
npm run dev
```

> 仓库内的 `.npmrc` 已将 Electron 二进制指向国内镜像，避免安装阶段从 GitHub 下载失败。

### 可用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发模式（热更新） |
| `npm run build` | 构建到 `out/` |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | 主进程 + 渲染进程类型检查 |
| `npm run build:dir` | 构建并打包为免安装目录 |
| `npm run build:win` | 递增版本号 → 类型检查 → 构建 → 打包 Windows 安装包 |

安装包产出在 `dist/Markdown Reader-<version>-setup.exe`（**未签名**，首次运行可能触发 SmartScreen 提示）。

## 项目结构

```
MarkdownReader/
├── src/
│   ├── main/                 # 主进程（Node 侧，所有文件系统访问在此）
│   │   ├── index.ts          # 应用入口、窗口、菜单
│   │   ├── ipc/              # IPC handler，按域拆分
│   │   │   ├── app.ts        #   版本、待打开文件
│   │   │   ├── fs.ts         #   读树 / 读写文件 / 增删改移
│   │   │   ├── links.ts      #   路径探测、系统默认程序打开
│   │   │   ├── search.ts     #   全文搜索
│   │   │   ├── store.ts      #   配置与最近打开
│   │   │   └── workspace.ts  #   打开文件夹 / 打开指定路径
│   │   ├── fileSystem.ts     # 文件操作实现
│   │   ├── workspace.ts      # 工作区根目录与路径越界校验
│   │   ├── watcher.ts        # chokidar 监听
│   │   ├── searchIndex.ts    # 工作区索引
│   │   ├── protocol.ts       # mdreader:// 自定义协议
│   │   ├── store.ts          # electron-store 封装
│   │   └── openFile.ts       # 文件关联 / 命令行传入的文件
│   ├── preload/              # contextBridge 白名单 API
│   ├── renderer/src/         # 渲染进程（Vue）
│   │   ├── components/       # 目录树、预览、标签页、大纲、搜索、状态栏…
│   │   ├── stores/           # Pinia：workspace / tabs / settings
│   │   ├── composables/      # markdown 渲染、右键菜单、输入弹窗
│   │   └── api/              # 对 window.api 的封装
│   └── shared/               # 主进程与渲染进程共用的纯函数
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```

## 架构与安全设计

**进程隔离。** 渲染进程不直接接触 Node API：`contextIsolation: true` + `nodeIntegration: false`，全部文件操作经 `preload` 用 `contextBridge` 暴露的白名单 API 走 IPC 到主进程。

**路径边界校验。** 所有路径在主进程内规范化，并校验必须落在当前工作区根目录内，越界一律拒绝。

**自定义媒体协议。** 文档中的本地图片与相对链接通过 `mdreader://media/<绝对路径>` 加载，该协议仅服务工作区内的文件，越界返回 403——避免渲染进程获得任意文件读取能力。

**删除可恢复。** 删除操作调用 `shell.trashItem` 移入系统回收站，而非物理删除。

**低版本文件。** 主进程为 CommonJS，`chokidar`、`electron-store` 固定在支持 CJS 的版本上，请勿升级到纯 ESM 版本。

## 已知限制

- **当前为纯阅读器**：`fs:writeFile` 的 IPC 通道已就绪但界面尚未接入，暂不支持在应用内编辑保存
- **拖拽移动**：`fs:move` 通道已就绪，目录树内的拖拽移动交互尚未实现
- **无自动化测试**：尚未接入单元测试与 E2E 测试
- **仅 Windows 打包**：`electron-builder.yml` 目前只配置了 Windows NSIS 目标，macOS / Linux 未配置
- **安装包未签名**：未配置代码签名证书，Windows 首次运行会有安全提示

## 许可证

[MIT](https://opensource.org/licenses/MIT)（见 `package.json` 的 `license` 字段）
