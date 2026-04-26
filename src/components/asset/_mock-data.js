/**
 * Mock asset library data for development.
 * Used when VITE_USE_ASSET_MOCK=true (no backend connection).
 */
export const MOCK_ASSETS = [
  {
    id: 1, source: 'jimeng', sourceUrl: 'https://jimeng.example/work/1',
    assetType: 'image',
    imageUrl: 'https://picsum.photos/seed/jimeng1/512/512',
    videoUrl: null, prompt: 'a cyberpunk cat in neon street, by greg rutkowski',
    width: 512, height: 512, fileSize: 102400,
    metadata: { seed: 42, model: 'jimeng-v3' },
    tags: ['赛博朋克', '猫'],
    createTime: '2026-04-25T10:00:00Z'
  },
  {
    id: 2, source: 'huaban', sourceUrl: 'https://huaban.com/pins/2',
    assetType: 'image',
    imageUrl: 'https://picsum.photos/seed/huaban2/640/480',
    videoUrl: null, prompt: null,
    width: 640, height: 480, fileSize: 88000,
    metadata: null, tags: ['人物参考'],
    createTime: '2026-04-25T11:00:00Z'
  },
  {
    id: 3, source: 'local', sourceUrl: null,
    assetType: 'image',
    imageUrl: 'https://picsum.photos/seed/local3/600/800',
    videoUrl: null, prompt: null,
    width: 600, height: 800, fileSize: 134000,
    metadata: null, tags: [],
    createTime: '2026-04-25T12:00:00Z'
  }
]

let nextId = 100

export function mockListPage({ pageNo = 1, pageSize = 20, source, assetType, keyword, tag } = {}) {
  let list = [...MOCK_ASSETS]
  if (source) list = list.filter(a => a.source === source)
  if (assetType) list = list.filter(a => a.assetType === assetType)
  if (keyword) list = list.filter(a => (a.prompt || '').includes(keyword))
  if (tag) list = list.filter(a => (a.tags || []).includes(tag))
  const total = list.length
  const start = (pageNo - 1) * pageSize
  const slice = list.slice(start, start + pageSize)
  return Promise.resolve({ list: slice, total })
}

export function mockImport({ source, sourceUrl, assetType, prompt, imageUrl }) {
  const dup = MOCK_ASSETS.find(a => a.source === source && a.sourceUrl === sourceUrl && sourceUrl)
  if (dup) {
    return Promise.resolve({ id: dup.id, imageUrl: dup.imageUrl, videoUrl: dup.videoUrl, duplicated: true })
  }
  const id = ++nextId
  const newAsset = {
    id, source, sourceUrl: sourceUrl || null, assetType: assetType || 'image',
    imageUrl: imageUrl || `https://picsum.photos/seed/upload${id}/512/512`,
    videoUrl: null, prompt: prompt || null,
    width: 512, height: 512, fileSize: 100000,
    metadata: null, tags: [],
    createTime: new Date().toISOString()
  }
  MOCK_ASSETS.unshift(newAsset)
  return Promise.resolve({ id, imageUrl: newAsset.imageUrl, videoUrl: null, duplicated: false })
}

export function mockDelete(id) {
  const idx = MOCK_ASSETS.findIndex(a => a.id === id)
  if (idx >= 0) MOCK_ASSETS.splice(idx, 1)
  return Promise.resolve(true)
}

export function mockUpdateTags(id, tags) {
  const a = MOCK_ASSETS.find(x => x.id === id)
  if (a) a.tags = [...tags]
  return Promise.resolve(true)
}
