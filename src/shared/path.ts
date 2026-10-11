export function parentDir(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx <= 0 ? path : path.slice(0, idx)
}

export function baseName(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

export function samePath(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return normalizePath(a) === normalizePath(b)
}

export function isInsidePath(root: string, target: string): boolean {
  const normalizedRoot = normalizePath(root)
  const normalizedTarget = normalizePath(target)
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(normalizedRoot + '/')
}

export function dirOf(path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx < 0 ? '' : path.slice(0, idx)
}

export function isAbsoluteFsPath(path: string): boolean {
  return /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(path)
}

export function joinFsPath(dir: string, rel: string): string {
  const sep = dir.includes('\\') ? '\\' : '/'
  const parts = (dir + sep + rel).split(/[\\/]+/)
  const out: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i]
    if (segment === '.') continue
    if (segment === '') {
      if (i === 0) out.push('')
      continue
    }
    if (segment === '..') {
      out.pop()
      continue
    }
    out.push(segment)
  }
  return out.join(sep)
}
