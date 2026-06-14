import { ref } from 'vue'
import type { Ref } from 'vue'
import { promptFlowCreate, promptFlowDelete, promptFlowPage, promptFlowPublishMy, promptFlowUpdate } from '@/api/flow'

// Raw backend record with arbitrary fields | 后端返回的原始记录（字段不固定）
type RawRecord = Record<string, unknown>

// Publish review status | 发布审核状态
type PublishStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | ''

// Normalized publish request | 归一化后的发布请求
interface PublishRequest {
  id: string
  flowId: string
  status: PublishStatus
  createdAt: number
  reviewComment: string
}

// Normalized workflow entry held in the store | 存储中的归一化工作流条目
export interface MyWorkflow extends RawRecord {
  id: string
  tags: unknown[]
  nodes: unknown[]
  edges: unknown[]
  publishStatus: PublishStatus
  publishRequestId: string
  publishReviewComment: string
}

export const myWorkflows: Ref<MyWorkflow[]> = ref([])

const normalizePublishStatus = (s: unknown): PublishStatus => {
  const v = String(s || '').toUpperCase()
  if (v === 'PENDING' || v === 'APPROVED' || v === 'REJECTED') return v
  if (v === 'WAIT' || v === 'SUBMITTED') return 'PENDING'
  if (v === 'PASS' || v === 'ACCEPTED') return 'APPROVED'
  if (v === 'FAIL' || v === 'DENIED') return 'REJECTED'
  return ''
}

const normalizePublishRequest = (r: RawRecord | null | undefined): PublishRequest | null => {
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

const mergePublishStatusToWorkflows = (workflows: MyWorkflow[], requests: RawRecord[]): MyWorkflow[] => {
  const list = Array.isArray(workflows) ? workflows : []
  const reqs = Array.isArray(requests) ? requests : []
  const latestByFlowId = new Map<string, PublishRequest>()

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

const normalizeWorkflow = (w: RawRecord | null | undefined): MyWorkflow | null => {
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

export const loadMyWorkflows = async (params: RawRecord = {}) => {
  try {
    const res = await promptFlowPage({
      pageNo: 1,
      pageSize: 200,
      withGraph: 1,
      ...params
    }) as { list?: RawRecord[] }
    const list = Array.isArray(res?.list) ? res.list : []
    const normalized = list.map(normalizeWorkflow).filter(Boolean) as MyWorkflow[]
    myWorkflows.value = normalized

    try {
      const reqRes = await promptFlowPublishMy() as { list?: RawRecord[] } | RawRecord[]
      const reqList = Array.isArray((reqRes as { list?: RawRecord[] })?.list)
        ? (reqRes as { list: RawRecord[] }).list
        : (Array.isArray(reqRes) ? reqRes : [])
      myWorkflows.value = mergePublishStatusToWorkflows(myWorkflows.value, reqList)
    } catch (err) {}
  } catch (err) {
    myWorkflows.value = []
  }
}

export const addMyWorkflow = async (payload: RawRecord) => {
  const data = await promptFlowCreate(payload) as RawRecord
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

export const upsertMyWorkflow = async (payload: RawRecord) => {
  const hasId = payload?.id != null && String(payload.id).trim() !== ''
  if (!hasId) {
    return addMyWorkflow(payload)
  }

  const data = await promptFlowUpdate({ ...payload, id: String(payload.id) }) as RawRecord
  const id = String(payload.id)
  const now = Date.now()
  const list = myWorkflows.value || []
  const idx = list.findIndex(w => String(w.id) === id)
  const prev = idx === -1 ? null : list[idx]
  const wf = normalizeWorkflow({
    ...(prev || {}),
    ...payload,
    id,
    updatedAt: data?.updatedAt || now
  })
  if (idx === -1) {
    myWorkflows.value = wf ? [wf, ...list] : list
  } else if (wf) {
    const next = [...list]
    next[idx] = wf
    myWorkflows.value = next
  }
  return wf
}

export const removeMyWorkflow = async (id: unknown) => {
  const workflowId = id == null ? '' : String(id)
  if (!workflowId) return
  await promptFlowDelete(workflowId)
  myWorkflows.value = (myWorkflows.value || []).filter(w => String(w.id) !== workflowId)
}

loadMyWorkflows()
