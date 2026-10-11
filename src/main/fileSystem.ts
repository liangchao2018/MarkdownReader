import { promises as fs } from 'fs'
import { basename, dirname, extname, join } from 'path'
import type { TreeNode } from '../preload/types'
import { MARKDOWN_EXTENSION_SET } from '../shared/markdown'

function isHidden(name: string): boolean {
  return name.startsWith('.')
}

function shouldShow(name: string, isDirectory: boolean): boolean {
  if (isHidden(name) || name === 'node_modules') return false
  if (isDirectory) return true
  return MARKDOWN_EXTENSION_SET.has(extname(name).toLowerCase())
}

export async function dirHasVisibleChildren(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.some((entry) => shouldShow(entry.name, entry.isDirectory()))
  } catch {
    return false
  }
}

export async function toTreeNode(path: string): Promise<TreeNode> {
  const stat = await fs.stat(path)
  const isDirectory = stat.isDirectory()
  return {
    name: basename(path),
    path,
    isDirectory,
    hasChildren: isDirectory ? await dirHasVisibleChildren(path) : false
  }
}

export async function readDir(dirPath: string): Promise<TreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes: TreeNode[] = []

  for (const entry of entries) {
    const isDirectory = entry.isDirectory()
    if (!shouldShow(entry.name, isDirectory)) continue

    const fullPath = join(dirPath, entry.name)
    nodes.push({
      name: entry.name,
      path: fullPath,
      isDirectory,
      hasChildren: isDirectory ? await dirHasVisibleChildren(fullPath) : false
    })
  }

  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-Hans-CN')
  })
  return nodes
}

export async function createEntry(
  parentDir: string,
  name: string,
  type: 'file' | 'directory'
): Promise<TreeNode> {
  const target = join(parentDir, name)
  try {
    await fs.access(target)
    throw new Error(`Entry already exists: ${name}`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Entry already exists')) throw error
  }

  if (type === 'directory') {
    await fs.mkdir(target)
  } else {
    await fs.writeFile(target, '', { flag: 'wx' })
  }

  return { name, path: target, isDirectory: type === 'directory', hasChildren: false }
}

export async function renameEntry(oldPath: string, newName: string): Promise<TreeNode> {
  const target = join(dirname(oldPath), newName)
  try {
    await fs.access(target)
    throw new Error(`Entry already exists: ${newName}`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Entry already exists')) throw error
  }

  await fs.rename(oldPath, target)
  return toTreeNode(target)
}

export async function moveEntry(srcPath: string, targetDir: string): Promise<TreeNode> {
  const target = join(targetDir, basename(srcPath))
  await fs.rename(srcPath, target)
  return toTreeNode(target)
}
