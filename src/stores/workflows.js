import { ref } from 'vue'

const STORAGE_KEY = 'ai-canvas-my-workflows'

export const myWorkflows = ref([])

const safeParse = (val, fallback) => {
  try {
    return JSON.parse(val)
  } catch (e) {
    return fallback
  }
}

export const loadMyWorkflows = () => {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(STORAGE_KEY)
  myWorkflows.value = Array.isArray(safeParse(raw || '[]', [])) ? safeParse(raw || '[]', []) : []
}

export const saveMyWorkflows = () => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(myWorkflows.value || []))
}

export const addMyWorkflow = (workflow) => {
  myWorkflows.value = [workflow, ...(myWorkflows.value || [])]
  saveMyWorkflows()
}

export const upsertMyWorkflow = (workflow) => {
  const list = myWorkflows.value || []
  const idx = list.findIndex(w => w.id === workflow?.id)
  if (idx === -1) {
    myWorkflows.value = [workflow, ...list]
  } else {
    const next = [...list]
    next[idx] = workflow
    myWorkflows.value = next
  }
  saveMyWorkflows()
}

export const removeMyWorkflow = (id) => {
  myWorkflows.value = (myWorkflows.value || []).filter(w => w.id !== id)
  saveMyWorkflows()
}

loadMyWorkflows()
