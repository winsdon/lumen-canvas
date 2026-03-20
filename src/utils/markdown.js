/**
 * Markdown rendering utility | Markdown 渲染工具
 * Uses marked for parsing and DOMPurify for XSS prevention
 */

import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Custom renderer: open links in new tab | 自定义渲染器：链接在新标签页打开
const renderer = {
  link({ href, title, text }) {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener">${text}</a>`
  }
}

// Configure marked | 配置 marked
marked.use({ renderer })
marked.setOptions({
  breaks: true,  // Line breaks → <br>
  gfm: true,     // GitHub Flavored Markdown
  async: false   // Ensure synchronous parsing (critical for v-html bindings)
})

// Configure DOMPurify to allow target and rel on links | 允许链接的 target 和 rel 属性
const PURIFY_CONFIG = {
  ADD_ATTR: ['target', 'rel']
}

/**
 * Render markdown text to sanitized HTML | 将 Markdown 文本渲染为安全的 HTML
 * @param {string} text - Raw markdown text
 * @returns {string} Sanitized HTML string
 */
export const renderMarkdown = (text) => {
  if (!text) return ''
  const html = marked.parse(text)
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}
