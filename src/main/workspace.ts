import { resolve, relative, isAbsolute } from 'path'

/**
 * 当前工作区根目录（单工作区模型）。
 * 所有文件操作都必须落在此根目录内，由 assertInsideRoot 校验，
 * 杜绝渲染进程通过构造路径越界访问任意文件系统。
 */
let currentRoot: string | null = null

export function getRoot(): string | null {
  return currentRoot
}

export function setRoot(root: string): string {
  currentRoot = resolve(root)
  return currentRoot
}

/** target 是否位于 root 内（含 root 自身） */
export function isInside(root: string, target: string): boolean {
  const rel = relative(resolve(root), resolve(target))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * 校验路径合法并返回规范化绝对路径。
 * 未打开工作区、或路径越界时抛错。
 */
export function assertInsideRoot(target: string): string {
  if (!currentRoot) {
    throw new Error('尚未打开工作区')
  }
  const abs = resolve(target)
  if (!isInside(currentRoot, abs)) {
    throw new Error(`路径越界，拒绝访问: ${target}`)
  }
  return abs
}
