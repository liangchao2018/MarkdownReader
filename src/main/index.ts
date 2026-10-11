import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers, disposeIpc } from './ipc'
import { getConfig, setConfig } from './store'
import { registerMediaScheme, registerMediaProtocol } from './protocol'
import { markdownFromArgv, setPendingFile, deliverOpenFile } from './openFile'

// 必须在 app ready 之前注册自定义协议方案
registerMediaScheme()

function createWindow(): void {
  const bounds = getConfig('windowBounds')
  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Markdown Reader',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 记忆窗口尺寸
  mainWindow.on('close', () => {
    const [width, height] = mainWindow.getSize()
    setConfig('windowBounds', { width, height })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // dev 模式加载 vite dev server，生产加载打包后的 html
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 单实例：文件关联在已运行时再次双击 .md，会以新参数拉起第二实例。
// 抢锁失败者退出，把文件路径交还给首实例的 second-instance 处理。
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const file = markdownFromArgv(argv)
    if (file) deliverOpenFile(file)
  })

  // 启动即由文件关联打开：从本进程 argv 推导待打开文件（仅打包态，dev 下 argv 为 electron .）
  if (app.isPackaged) {
    setPendingFile(markdownFromArgv(process.argv))
  }

  // macOS：通过 Finder「打开方式」启动或运行中打开
  app.on('open-file', (event, path) => {
    event.preventDefault()
    if (app.isReady()) deliverOpenFile(path)
    else setPendingFile(path)
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.markdownreader.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerMediaProtocol()
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    disposeIpc()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
