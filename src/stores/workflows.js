import { ref } from 'vue'
import { promptFlowCreate, promptFlowDelete, promptFlowPage, promptFlowPublishMy, promptFlowUpdate } from '@/api/flow'

export const myWorkflows = ref([])

const normalizePublishStatus = (s) => {
  // Handle integer status from backend | 处理后端返回的整数状态
  if (s === 1 || s === '1') return 'PENDING'
  if (s === 2 || s === '2') return 'APPROVED'
  if (s === 3 || s === '3') return 'REJECTED'

  const v = String(s || '').toUpperCase()
  if (v === 'PENDING' || v === 'APPROVED' || v === 'REJECTED') return v
  if (v === 'WAIT' || v === 'SUBMITTED') return 'PENDING'
  if (v === 'PASS' || v === 'ACCEPTED') return 'APPROVED'
  if (v === 'FAIL' || v === 'DENIED') return 'REJECTED'
  return ''
}

const normalizePublishRequest = (r) => {
  if (!r) return null
  const id = r.id == null ? '' : String(r.id)
  const flowId = r.flowId ?? r.workflowId ?? r.promptFlowId
  const status = normalizePublishStatus(r.status)
  const createdAt = r.createdAt ?? r.submitAt ?? r.submittedAt ?? r.createTime ?? r.createdTime ?? 0
  const reviewComment = r.reviewComment ?? r.auditComment ?? r.reason ?? ''
  return {
    id,
    flowId: flowId == null ? '' : String(flowId),
    status,
    createdAt: Number(createdAt) || 0,
    reviewComment: String(reviewComment || '')
  }
}

const mergePublishStatusToWorkflows = (workflows, requests) => {
  const list = Array.isArray(workflows) ? workflows : []
  const reqs = Array.isArray(requests) ? requests : []
  const latestByFlowId = new Map()

  for (const raw of reqs) {
    const r = normalizePublishRequest(raw)
    if (!r?.flowId) continue
    const prev = latestByFlowId.get(r.flowId)
    if (!prev || (r.createdAt || 0) >= (prev.createdAt || 0)) {
      latestByFlowId.set(r.flowId, r)
    }
  }

  return list.map(w => {
    const flowId = w?.id == null ? '' : String(w.id)
    const req = latestByFlowId.get(flowId)
    return {
      ...w,
      publishStatus: req?.status || w?.publishStatus || '',
      publishRequestId: req?.id || w?.publishRequestId || '',
      publishReviewComment: req?.reviewComment || (req?.status === 'REJECTED' ? '' : (w?.publishReviewComment || ''))
    }
  })
}

const normalizeWorkflow = (w) => {
  if (!w) return null
  const id = w.id == null ? '' : String(w.id)
  return {
    ...w,
    id,
    tags: Array.isArray(w.tags) ? w.tags : [],
    nodes: Array.isArray(w.nodes) ? w.nodes : [],
    edges: Array.isArray(w.edges) ? w.edges : [],
    publishStatus: normalizePublishStatus(w.publishStatus),
    publishRequestId: w.publishRequestId == null ? '' : String(w.publishRequestId),
    publishReviewComment: String(w.publishReviewComment || '')
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
    const normalized = list.map(normalizeWorkflow).filter(Boolean)
    myWorkflows.value = normalized

    try {
      const reqRes = await promptFlowPublishMy({ pageNo: 1, pageSize: 200 })
      const reqList = Array.isArray(reqRes?.list) ? reqRes.list : (Array.isArray(reqRes) ? reqRes : [])
      myWorkflows.value = mergePublishStatusToWorkflows(myWorkflows.value, reqList)
    } catch (err) {}
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
  const list = myWorkflows.value || []
  const idx = list.findIndex(w => String(w.id) === id)
  const prev = idx === -1 ? null : list[idx]
  // Merge backend response (publishStatus etc.) into local state | 合并后端返回的状态
  const backendFields = {}
  if (data?.publishStatus != null) backendFields.publishStatus = data.publishStatus
  const wf = normalizeWorkflow({
    ...(prev || {}),
    ...payload,
    ...backendFields,
    id,
    updatedAt: data?.updatedAt || now
  })
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
