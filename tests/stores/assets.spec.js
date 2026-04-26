/**
 * Asset store unit tests | 资产库 Store 单元测试
 *
 * Note: vitest is not yet wired into this project. This spec is a placeholder
 * for a future task that installs the runner. Adapted to the project's
 * module-level reactive ref store pattern (no Pinia).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/api/asset', () => ({
  getAssetPage: vi.fn(),
  importAsset: vi.fn(),
  deleteAsset: vi.fn(),
  updateAssetTags: vi.fn()
}))

import * as api from '@/api/asset'
import {
  list, page, total, hasMore, loading, filters,
  reload, loadMore, remove, updateTags, resetFilters
} from '@/stores/assets'

describe('assets store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    list.value = []
    page.value = 1
    total.value = 0
    hasMore.value = true
    loading.value = false
    resetFilters()
  })

  it('reload fetches page 1 and replaces list', async () => {
    api.getAssetPage.mockResolvedValueOnce({
      list: [{ id: 1, source: 'local' }],
      total: 1
    })
    list.value = [{ id: 999 }] // stale data should be cleared
    await reload()
    expect(list.value).toEqual([{ id: 1, source: 'local' }])
    expect(total.value).toBe(1)
    expect(page.value).toBe(2)
    expect(hasMore.value).toBe(false)
  })

  it('loadMore skips when already loading', async () => {
    loading.value = true
    await loadMore()
    expect(api.getAssetPage).not.toHaveBeenCalled()
  })

  it('loadMore skips when no more pages', async () => {
    hasMore.value = false
    await loadMore()
    expect(api.getAssetPage).not.toHaveBeenCalled()
  })

  it('remove deletes from list and decrements total', async () => {
    api.deleteAsset.mockResolvedValueOnce(true)
    list.value = [{ id: 1 }, { id: 2 }]
    total.value = 2
    await remove(1)
    expect(list.value).toEqual([{ id: 2 }])
    expect(total.value).toBe(1)
  })

  it('updateTags replaces tags immutably', async () => {
    api.updateAssetTags.mockResolvedValueOnce(true)
    const original = { id: 1, tags: ['old'] }
    list.value = [original]
    await updateTags(1, ['new', 'fresh'])
    expect(list.value[0].tags).toEqual(['new', 'fresh'])
    // Verify immutability — original object not mutated
    expect(original.tags).toEqual(['old'])
  })

  it('filters are pruned before being sent to API', async () => {
    api.getAssetPage.mockResolvedValueOnce({ list: [], total: 0 })
    filters.source = 'local'
    filters.keyword = ''
    filters.tag = null
    await reload()
    const callArgs = api.getAssetPage.mock.calls[0][0]
    expect(callArgs.source).toBe('local')
    expect(callArgs).not.toHaveProperty('keyword')
    expect(callArgs).not.toHaveProperty('tag')
  })
})
