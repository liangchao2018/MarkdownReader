export const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'] as const

export const MARKDOWN_EXTENSION_SET = new Set<string>(MARKDOWN_EXTENSIONS)

export const MARKDOWN_FILE_RE = /\.(md|markdown|mdown|mkd)$/i

export const MEDIA_SCHEME = 'mdreader'
