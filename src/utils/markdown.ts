/**
 * Markdown rendering utility | Markdown 渲染工具
 * Uses marked for parsing and DOMPurify for XSS prevention
 */

import { marked, type RendererObject, type Tokens } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Escape string for safe HTML attribute insertion | 转义字符串用于安全的 HTML 属性插入
 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;'
}
const escapeAttr = (s: string | null | undefined): string =>
  (s || '').replace(/[&"'<>]/g, (c) => ESCAPE_MAP[c] ?? c)

// Custom renderer: open links in new tab, wrap images with add-to-canvas overlay
// 自定义渲染器：链接在新标签页打开，图片包装添加到画布覆盖层
const renderer: RendererObject = {
  link({ href, title, text }: Tokens.Link) {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener">${text}</a>`
  },

  image({ href, text }: Tokens.Image) {
    // Wrap all images with add-to-canvas overlay | 包装图片，添加到画布覆盖层
    const alt = text || ''
    return `<div class="md-image-wrapper" data-image-url="${escapeAttr(href)}" data-prompt="${escapeAttr(alt)}"><img src="${escapeAttr(href)}" alt="${escapeAttr(alt)}" loading="lazy" /><div class="md-image-overlay"><span class="md-prompt-text">${escapeAttr(alt)}</span><span role="button" tabindex="0" class="add-to-canvas-btn" data-action="add-to-canvas">➕ 添加到画布</span></div></div>`
  }
}

// Configure marked | 配置 marked
marked.use({ renderer })
marked.setOptions({
  breaks: true,  // Line breaks → <br>
  gfm: true,     // GitHub Flavored Markdown
  async: false   // Ensure synchronous parsing (critical for v-html bindings)
})

// Configure DOMPurify to allow custom attrs | 允许自定义属性
const PURIFY_CONFIG = {
  ADD_ATTR: ['target', 'rel', 'data-image-url', 'data-prompt', 'data-action', 'role', 'tabindex']
}

/**
 * Render markdown text to sanitized HTML | 将 Markdown 文本渲染为安全的 HTML
 * @param {string} text - Raw markdown text
 * @returns {string} Sanitized HTML string
 */
export const renderMarkdown = (text: string | null | undefined): string => {
  if (!text) return ''
  // async:false guarantees a synchronous string | async:false 保证同步返回 string
  const html = marked.parse(text) as string
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}
