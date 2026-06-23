export interface ParsedDocxAsset {
  id: string
  previewUrl: string
  imageFile?: File
  sourceName: string
  prompt: string
  platform: string
  model: string
  category: string
  tags: string[]
  notes: string
}

interface ZipEntry {
  name: string
  method: number
  data: Uint8Array
}

const WORD_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const REL_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const platformPatterns = [
  { name: '即梦', model: '4.5', patterns: [/即梦\s*4\.5/i, /jimeng\s*4\.5/i] },
  { name: '即梦', model: '', patterns: [/即梦/i, /jimeng/i] },
  { name: 'Midjourney', model: '', patterns: [/midjourney/i, /\/imagine/i] },
  { name: '可灵', model: '', patterns: [/可灵/i, /kling/i] },
  { name: '豆包', model: '', patterns: [/豆包/i, /doubao/i] },
  { name: '通义万相', model: '', patterns: [/通义万相/i, /wanxiang/i] },
  { name: 'Stable Diffusion', model: '', patterns: [/stable diffusion/i, /\bsd\b/i] },
  { name: 'DALL-E', model: '', patterns: [/dall[ -]?e/i] },
  { name: 'Leonardo', model: '', patterns: [/leonardo/i] }
]

const categoryRules = [
  { category: 'UI', words: ['ui', 'ux', 'app', 'web', 'dashboard', '界面', '组件', '按钮', '图标'] },
  { category: '电商', words: ['电商', '商品', '主图', '详情页', 'banner', '促销', '海报', '货架'] },
  { category: '国漫', words: ['国漫', '动漫', '二次元', '角色', '古风', '仙侠', '武侠'] },
  { category: '平面', words: ['平面', 'poster', '海报', '排版', '字体', '版式', '视觉'] },
  { category: '摄影', words: ['摄影', 'photo', '镜头', '相机', '人像', '写实'] },
  { category: '插画', words: ['插画', 'illustration', '绘本', '手绘', '矢量'] },
  { category: '产品', words: ['产品', 'product', '工业设计', '包装', '3d icon'] },
  { category: '空间', words: ['空间', '室内', '建筑', '展厅', '家居', 'interior'] },
  { category: '角色', words: ['人物', '角色', 'character', '头像', '半身', '全身'] }
]

export const isDocxFile = (file: File) => {
  return /\.docx$/i.test(file.name) ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export const parseDocxAssets = async (files: File[]): Promise<ParsedDocxAsset[]> => {
  const assets: ParsedDocxAsset[] = []
  const now = Date.now()
  for (const file of files.filter(isDocxFile)) {
    const parsed = await parseDocxFile(file, now + assets.length)
    assets.push(...parsed)
  }
  return assets
}

const parseDocxFile = async (file: File, timestampBase: number): Promise<ParsedDocxAsset[]> => {
  const entries = await readZipEntries(file)
  const documentXml = readZipText(entries, 'word/document.xml')
  const relsXml = readZipText(entries, 'word/_rels/document.xml.rels')
  if (!documentXml || !relsXml) return []
  return parseDocxFileFromEntries(file, timestampBase, entries, documentXml, relsXml)
}

const parseDocxFileFromEntries = async (
  file: File,
  timestampBase: number,
  entries: Map<string, ZipEntry>,
  documentXml: string,
  relsXml: string
): Promise<ParsedDocxAsset[]> => {
  const relationships = parseDocxRelationships(relsXml)
  const paragraphs = parseDocxParagraphs(documentXml)
  const imageOccurrences: Array<{ relId: string; paragraphIndex: number }> = []
  paragraphs.forEach((paragraph, paragraphIndex) => {
    paragraph.imageRelIds.forEach(relId => imageOccurrences.push({ relId, paragraphIndex }))
  })

  if (!imageOccurrences.length) {
    const fields = parseDocxFields(paragraphs.map(paragraph => paragraph.text).filter(Boolean))
    if (!fields.prompt && !fields.notes) return []
    const placeholder = createPromptPlaceholderDataUrl(fields.prompt || fields.notes || file.name)
    return [{
      id: crypto.randomUUID ? crypto.randomUUID() : `${timestampBase}-text`,
      previewUrl: placeholder,
      imageFile: dataUrlToFile(placeholder, `${fileNameWithoutExt(file.name)}-prompt.svg`),
      sourceName: `${file.name} / prompt-only`,
      prompt: fields.prompt,
      platform: fields.platform,
      model: fields.model,
      category: fields.category,
      tags: fields.tags,
      notes: fields.notes
    }]
  }

  const imported: ParsedDocxAsset[] = []
  for (let index = 0; index < imageOccurrences.length; index += 1) {
    const occurrence = imageOccurrences[index]
    const mediaPath = relationships.get(occurrence.relId)
    const entry = mediaPath ? entries.get(mediaPath) : null
    const mime = mediaPath ? getImageMimeFromPath(mediaPath) : ''
    if (!entry || !mime || !mediaPath) continue

    const fields = parseDocxFields(getDocxContextTexts(paragraphs, occurrence.paragraphIndex))
    const blob = new Blob([toArrayBuffer(entry.data)], { type: mime })
    const previewUrl = await blobToDataUrl(blob)
    const extension = mediaPath.split('.').pop() || 'png'
    imported.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${timestampBase}-${index}`,
      previewUrl,
      imageFile: new File([blob], `${fileNameWithoutExt(file.name)}-${index + 1}.${extension}`, { type: mime }),
      sourceName: `${file.name} / ${mediaPath.split('/').pop() || `image-${index + 1}`}`,
      prompt: fields.prompt,
      platform: fields.platform,
      model: fields.model,
      category: fields.category,
      tags: fields.tags,
      notes: fields.notes
    })
  }
  return imported
}

const readZipEntries = async (file: File): Promise<Map<string, ZipEntry>> => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocdOffset = findZipEndOfCentralDirectory(view)
  if (eocdOffset < 0) throw new Error('Invalid docx file')

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  let cursor = view.getUint32(eocdOffset + 16, true)
  const entries = new Map<string, ZipEntry>()

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid central directory')
    const method = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const fileNameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const nameBytes = bytes.slice(cursor + 46, cursor + 46 + fileNameLength)
    const name = new TextDecoder('utf-8').decode(nameBytes).replace(/\\/g, '/')
    const dataStart = getZipEntryDataOffset(view, localHeaderOffset)
    const compressed = bytes.slice(dataStart, dataStart + compressedSize)
    entries.set(name, {
      name,
      method,
      data: method === 0 ? compressed : await inflateZipEntry(compressed, method)
    })
    cursor += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

const findZipEndOfCentralDirectory = (view: DataView) => {
  const minOffset = Math.max(0, view.byteLength - 22 - 65535)
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  return -1
}

const getZipEntryDataOffset = (view: DataView, localHeaderOffset: number) => {
  if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) throw new Error('Invalid local header')
  const fileNameLength = view.getUint16(localHeaderOffset + 26, true)
  const extraLength = view.getUint16(localHeaderOffset + 28, true)
  return localHeaderOffset + 30 + fileNameLength + extraLength
}

const inflateZipEntry = async (bytes: Uint8Array, method: number) => {
  if (method !== 8) throw new Error(`Unsupported zip method ${method}`)
  if (!('DecompressionStream' in window)) throw new Error('DecompressionStream is not supported')
  const formats: CompressionFormat[] = ['deflate-raw', 'deflate']
  for (const format of formats) {
    try {
      const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream(format))
      return new Uint8Array(await new Response(stream).arrayBuffer())
    } catch {
      // Try the next format.
    }
  }
  throw new Error('Unable to inflate zip entry')
}

const readZipText = (entries: Map<string, ZipEntry>, path: string) => {
  const entry = entries.get(path)
  return entry ? new TextDecoder('utf-8').decode(entry.data) : ''
}

const parseDocxRelationships = (xmlText: string) => {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml')
  const result = new Map<string, string>()
  for (const relationship of [...xml.getElementsByTagName('Relationship')]) {
    const id = relationship.getAttribute('Id')
    const target = relationship.getAttribute('Target') || ''
    const type = relationship.getAttribute('Type') || ''
    if (!id || !/\/image$/i.test(type)) continue
    result.set(id, normalizeDocxPath('word', target))
  }
  return result
}

const normalizeDocxPath = (base: string, target: string) => {
  const parts = (target.startsWith('/') ? target.slice(1) : `${base}/${target}`).split('/')
  const normalized: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') normalized.pop()
    else normalized.push(part)
  }
  return normalized.join('/')
}

const parseDocxParagraphs = (xmlText: string) => {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml')
  const paragraphs = [...xml.getElementsByTagNameNS(WORD_NAMESPACE, 'p')]
  const nodes = paragraphs.length ? paragraphs : [...xml.getElementsByTagName('w:p')]
  return nodes.map(paragraph => ({
    text: extractDocxParagraphText(paragraph),
    imageRelIds: extractDocxImageRelIds(paragraph)
  }))
}

const extractDocxParagraphText = (paragraph: Element) => {
  let text = ''
  for (const node of [...paragraph.getElementsByTagName('*')]) {
    if (node.localName === 't') text += node.textContent || ''
    if (node.localName === 'tab') text += '\t'
    if (node.localName === 'br') text += '\n'
  }
  return cleanText(text)
}

const extractDocxImageRelIds = (paragraph: Element) => {
  const relIds: string[] = []
  for (const node of [...paragraph.getElementsByTagName('*')]) {
    if (node.localName !== 'blip') continue
    const relId = node.getAttributeNS(REL_NAMESPACE, 'embed') ||
      node.getAttribute('r:embed') ||
      node.getAttribute('embed')
    if (relId) relIds.push(relId)
  }
  return relIds
}

const getDocxContextTexts = (
  paragraphs: Array<{ text: string; imageRelIds: string[] }>,
  paragraphIndex: number
) => {
  const previousImageIndex = findNearestDocxImageParagraph(paragraphs, paragraphIndex, -1)
  const nextImageIndex = findNearestDocxImageParagraph(paragraphs, paragraphIndex, 1)
  const start = Math.max(previousImageIndex + 1, paragraphIndex - 8, 0)
  const end = Math.min(nextImageIndex < 0 ? paragraphs.length - 1 : nextImageIndex - 1, paragraphIndex + 10)
  return paragraphs.slice(start, end + 1).map(paragraph => paragraph.text).filter(Boolean)
}

const findNearestDocxImageParagraph = (
  paragraphs: Array<{ text: string; imageRelIds: string[] }>,
  startIndex: number,
  direction: number
) => {
  for (let index = startIndex + direction; index >= 0 && index < paragraphs.length; index += direction) {
    if (paragraphs[index].imageRelIds.length) return index
  }
  return -1
}

const parseDocxFields = (texts: string[]) => {
  const joined = cleanText(texts.join('\n'))
  const labeled = parseLabeledDocxText(joined)
  const detectedPlatform = detectPlatform(joined)
  const prompt = normalizePrompt(labeled.prompt || extractPrompt(joined) || getFallbackPrompt(texts))
  const category = cleanText(labeled.category) || suggestCategory(`${prompt}\n${joined}`)
  const tags = splitTags(labeled.tags)
  return {
    prompt,
    platform: cleanText(labeled.platform) || detectedPlatform.name || '未知平台',
    model: cleanText(labeled.model) || detectedPlatform.model,
    category: category || '其他',
    tags: tags.length ? tags : suggestTags(`${prompt}\n${joined}`, category),
    notes: cleanText(labeled.notes)
  }
}

const parseLabeledDocxText = (text: string) => {
  const result = { prompt: '', platform: '', model: '', category: '', tags: '', notes: '' }
  const labelPattern = /(Prompt|prompt|提示词|正向提示词|描述|平台|Platform|platform|模型|Model|model|分类|分组|Category|category|标签|Tags?|tags?|备注|Notes?|notes?)\s*[:：]/g
  const matches = [...text.matchAll(labelPattern)]
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const key = docxLabelToField(match[1])
    if (!key || match.index === undefined) continue
    const start = match.index + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length
    const value = cleanText(text.slice(start, end))
    if (value) result[key] = result[key] ? `${result[key]}\n${value}` : value
  }
  return result
}

const docxLabelToField = (label: string): keyof ReturnType<typeof parseLabeledDocxText> | '' => {
  const value = label.toLowerCase()
  if (value === 'prompt' || label === '提示词' || label === '正向提示词' || label === '描述') return 'prompt'
  if (value === 'platform' || label === '平台') return 'platform'
  if (value === 'model' || label === '模型') return 'model'
  if (value === 'category' || label === '分类' || label === '分组') return 'category'
  if (value === 'tag' || value === 'tags' || label === '标签') return 'tags'
  if (value === 'note' || value === 'notes' || label === '备注') return 'notes'
  return ''
}

const detectPlatform = (text: string) => {
  for (const platform of platformPatterns) {
    if (platform.patterns.some(pattern => pattern.test(text))) {
      return { name: platform.name, model: platform.model }
    }
  }
  return { name: '', model: '' }
}

const extractPrompt = (text: string) => {
  const lines = cleanText(text).split('\n').map(line => line.trim()).filter(Boolean)
  const promptLine = lines.find(line => /^(prompt|提示词|正向提示词|描述)\s*[:：]/i.test(line))
  if (promptLine) return promptLine.replace(/^(prompt|提示词|正向提示词|描述)\s*[:：]/i, '')
  return getFallbackPrompt(lines)
}

const getFallbackPrompt = (texts: string[]) => {
  return texts
    .map(text => cleanText(text))
    .filter(text => text.length > 8 && !/^(Platform|Model|Category|Tags?|Notes?|平台|模型|分类|标签|备注)\s*[:：]/i.test(text))
    .sort((a, b) => b.length - a.length)[0] || ''
}

const cleanText = (text: string) => {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const normalizePrompt = (text: string) => {
  return cleanText(text)
    .replace(/\n+/g, ' ')
    .replace(/\s*([，。！？、；,.!?;:])\s*/g, '$1')
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
}

const splitTags = (value: string) => {
  return String(value || '')
    .split(/[,，;；、\n]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12)
}

const suggestCategory = (text: string) => {
  const lower = text.toLowerCase()
  const matched = categoryRules.find(rule => rule.words.some(word => lower.includes(word.toLowerCase())))
  return matched?.category || '其他'
}

const suggestTags = (text: string, category: string) => {
  const tags = new Set<string>()
  if (category && category !== '其他') tags.add(category)
  const dictionary = ['海报', 'Banner', '国风', '赛博朋克', '毛玻璃', '3D', '写实', '插画', '头像', '移动端', 'Dashboard']
  for (const item of dictionary) {
    if (text.toLowerCase().includes(item.toLowerCase())) tags.add(item)
  }
  return [...tags].slice(0, 5)
}

const getImageMimeFromPath = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif'
  }
  return ext ? types[ext] || '' : ''
}

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(reader.error || new Error('Blob read failed'))
  reader.readAsDataURL(blob)
})

const dataUrlToFile = (dataUrl: string, fileName: string) => {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/svg+xml'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new File([bytes], fileName, { type: mime })
}

const createPromptPlaceholderDataUrl = (prompt: string) => {
  const safePrompt = escapeSvgText(prompt || '仅提示词素材').slice(0, 120)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#111827"/><rect x="64" y="64" width="832" height="512" rx="28" fill="#1f2937" stroke="#4b5563"/><text x="112" y="150" fill="#e5e7eb" font-size="34" font-family="Arial, sans-serif" font-weight="700">Prompt Only</text><foreignObject x="112" y="190" width="736" height="300"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#d1d5db;font:28px Arial,sans-serif;line-height:1.45;word-break:break-word;">${safePrompt}</div></foreignObject></svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

const escapeSvgText = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const fileNameWithoutExt = (name: string) => name.replace(/\.[^.]+$/, '') || 'docx-asset'

const toArrayBuffer = (bytes: Uint8Array) => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
