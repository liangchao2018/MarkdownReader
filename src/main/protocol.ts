import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { getRoot, isInside } from './workspace'
import { MEDIA_SCHEME } from '../shared/markdown'

/** 自定义媒体协议名;渲染进程用 mdreader://media/<encodeURIComponent(绝对路径)> 引用工作区内资源 */
export { MEDIA_SCHEME }

/**
 * 必须在 app ready 之前调用：把协议注册为 standard + secure，
 * 使其能像 https 一样被 <img>/fetch 加载且不被当作不安全来源。
 */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/**
 * 在 app ready 之后调用：处理媒体请求。
 * 仅服务当前工作区根目录内的文件，越界一律 403，杜绝任意文件读取。
 */
export function registerMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      const filePath = decodeURIComponent(url.pathname.replace(/^\//, ''))
      const root = getRoot()
      if (!root || !isInside(root, filePath)) {
        return new Response('Forbidden', { status: 403 })
      }
      return net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Bad Request', { status: 400 })
    }
  })
}
