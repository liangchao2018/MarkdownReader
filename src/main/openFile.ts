import { BrowserWindow } from 'electron'

/** 视为 Markdown 的扩展名（与 ipc 中 MD_EXTS 对应） */
const MD_EXT = /\.(md|markdown|mdown|mkd)$/i

/**
 * 从命令行参数中提取首个 Markdown 文件路径。
 * 用于「文件关联 / 命令行」启动或运行中再次打开的场景（Windows）。
 */
export function markdownFromArgv(argv: string[]): string | null {
  // argv[0] 是可执行文件本身，跳过；忽略以 - 开头的开关参数
  for (const arg of argv.slice(1)) {
    if (arg.startsWith('-')) continue
    if (MD_EXT.test(arg)) return arg
  }
  return null
}

/** 待渲染进程就绪后打开的文件（启动即由关联打开时，先暂存于此） */
let pendingFile: string | null = null

export function setPendingFile(path: string | null): void {
  pendingFile = path
}

/** 取出并清空待打开文件（渲染进程挂载后调用一次） */
export function takePendingFile(): string | null {
  const f = pendingFile
  pendingFile = null
  return f
}

/**
 * 运行中再次「打开方式」打开文件：投递给已存在的窗口并聚焦。
 * 窗口尚未创建时回退为暂存，待就绪后由渲染进程主动拉取。
 */
export function deliverOpenFile(path: string): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) {
    pendingFile = path
    return
  }
  if (win.isMinimized()) win.restore()
  win.focus()
  win.webContents.send('open:file', path)
}
