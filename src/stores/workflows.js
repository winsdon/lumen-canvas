import { ref } from 'vue'
import { promptFlowCreate, promptFlowDelete, promptFlowPage, promptFlowUpdate } from '@/api/flow'

export const myWorkflows = ref([])

const normalizeWorkflow = (w) => {
  if (!w) return null
  const id = w.id == null ? '' : String(w.id)
  return {
    ...w,
    id,
    tags: Array.isArray(w.tags) ? w.tags : [],
    nodes: Array.isArray(w.nodes) ? w.nodes : [],
    edges: Array.isArray(w.edges) ? w.edges : []
  }
}

export const loadMyWorkflows = async (params = {}) => {
  try {
    const res = await promptFlowPage({
      pageNo: 1,
      pageSize: 200,
      withGraph: 1,
      ...params
    })
    const list = Array.isArray(res?.list) ? res.list : []
    myWorkflows.value = list.map(normalizeWorkflow).filter(Boolean)
  } catch (err) {
    myWorkflows.value = []
  }
}

export const addMyWorkflow = async (payload) => {
  const data = await promptFlowCreate(payload)
  const id = data?.id == null ? '' : String(data.id)
  const now = Date.now()
  const wf = normalizeWorkflow({
    ...payload,
    id,
    createdAt: data?.createdAt || now,
    updatedAt: data?.updatedAt || now
  })
  myWorkflows.value = wf ? [wf, ...(myWorkflows.value || [])] : (myWorkflows.value || [])
  return wf
}

export const upsertMyWorkflow = async (payload) => {
  const hasId = payload?.id != null && String(payload.id).trim() !== ''
  if (!hasId) {
    return addMyWorkflow(payload)
  }

  const data = await promptFlowUpdate({ ...payload, id: String(payload.id) })
  const id = String(payload.id)
  const now = Date.now()
  const wf = normalizeWorkflow({
    ...payload,
    id,
    updatedAt: data?.updatedAt || now
  })

  const list = myWorkflows.value || []
  const idx = list.findIndex(w => String(w.id) === id)
  if (idx === -1) {
    myWorkflows.value = wf ? [wf, ...list] : list
  } else {
    const next = [...list]
    next[idx] = wf
    myWorkflows.value = next
  }
  return wf
}

export const removeMyWorkflow = async (id) => {
  const workflowId = id == null ? '' : String(id)
  if (!workflowId) return
  await promptFlowDelete(workflowId)
  myWorkflows.value = (myWorkflows.value || []).filter(w => String(w.id) !== workflowId)
}

loadMyWorkflows()
