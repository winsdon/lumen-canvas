# Agent Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Agent chat panel to show collapsible thinking blocks, unified tool cards, and markdown image add-to-canvas overlays.

**Architecture:** Three independent frontend changes: (1) `useAgent.js` SSE event handling rewrite for new message roles, (2) `AgentPanel.vue` template/CSS rewrite with local expand/collapse state, (3) `markdown.js` custom image renderer with event delegation. No backend changes needed.

**Tech Stack:** Vue 3 Composition API, Naive UI, marked + DOMPurify, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-20-agent-panel-redesign-design.md`

**Note:** lumen-canvas has no test framework. Verification is manual (browser dev tools + visual inspection).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/hooks/useAgent.js` | SSE event → message data transformation (thinking, tool_call, tool_result handlers) |
| `src/components/AgentPanel.vue` | Message rendering (thinking blocks, tool cards, image overlays), expand/collapse state |
| `src/utils/markdown.js` | Markdown → HTML with image overlay wrapper, DOMPurify config |
| `src/components/agent/tool-renderers/DraftCreatedRenderer.vue` | Prop name fix (result → data) |
| `src/components/agent/tool-renderers/ListTemplatesRenderer.vue` | Prop name fix (result → data) |
| `src/components/agent/ToolStatusCard.vue` | **DELETE** — absorbed into AgentPanel |

---

### Task 1: Fix renderer prop mismatch (pre-existing bug)

**Files:**
- Modify: `src/components/agent/tool-renderers/DraftCreatedRenderer.vue:11-12`
- Modify: `src/components/agent/tool-renderers/ListTemplatesRenderer.vue:14-15`

- [ ] **Step 1: Fix DraftCreatedRenderer prop name**

In `src/components/agent/tool-renderers/DraftCreatedRenderer.vue`, change line 12:

```js
// Before | 修改前
const props = defineProps({
  result: { type: [Object, String], default: () => ({}) },
})

// After | 修改后
const props = defineProps({
  data: { type: [Object, String], default: () => ({}) },
})
```

Then update all references from `props.result` to `props.data` (line 17):

```js
// Before
return typeof props.result === 'string' ? JSON.parse(props.result) : props.result

// After
return typeof props.data === 'string' ? JSON.parse(props.data) : props.data
```

- [ ] **Step 2: Fix ListTemplatesRenderer prop name**

In `src/components/agent/tool-renderers/ListTemplatesRenderer.vue`, change line 15:

```js
// Before
const props = defineProps({
  result: { type: [Object, String, Array], default: () => ({}) },
})

// After
const props = defineProps({
  data: { type: [Object, String, Array], default: () => ({}) },
})
```

Update reference on line 20:

```js
// Before
const data = typeof props.result === 'string' ? JSON.parse(props.result) : props.result

// After
const raw = typeof props.data === 'string' ? JSON.parse(props.data) : props.data
```

And update usage on line 22:

```js
// Before
return Array.isArray(data) ? data : []

// After
return Array.isArray(raw) ? raw : []
```

- [ ] **Step 3: Commit**

```bash
git add src/components/agent/tool-renderers/DraftCreatedRenderer.vue src/components/agent/tool-renderers/ListTemplatesRenderer.vue
git commit -m "fix: rename renderer props from result to data to match parent binding"
```

---

### Task 2: Rewrite useAgent.js SSE event handlers

**Files:**
- Modify: `src/hooks/useAgent.js:62-155` (switch statement inside for-await loop)

- [ ] **Step 1: Rewrite `thinking` event handler (lines 139-141)**

Replace the no-op `thinking` case with accumulation logic:

```js
case 'thinking': {
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg && lastMsg.role === 'thinking') {
    // Accumulate into existing thinking block | 追加到现有 thinking 块
    messages.value = messages.value.map((msg, i) =>
      i === messages.value.length - 1
        ? { ...msg, content: msg.content + '\n' + (data.content || '') }
        : msg
    )
  } else {
    // Flush text buffer first, then create new thinking block
    // 先刷新文本缓冲，再创建新 thinking 块
    if (textBuffer.trim()) {
      messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
      textBuffer = ''
      currentResponse.value = ''
    }
    // Create new thinking block | 创建新 thinking 块
    messages.value = [
      ...messages.value,
      createMessage({ role: 'thinking', content: data.content || '' })
    ]
  }
  break
}
```

- [ ] **Step 2: Rewrite `tool_call` event handler (lines 70-93)**

Replace the current handler that creates `role: 'tool_status'` with `role: 'tool_call'`:

```js
case 'tool_call': {
  // Flush accumulated text before tool call | 工具调用前先刷新文本
  if (textBuffer.trim()) {
    messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
    textBuffer = ''
    currentResponse.value = ''
  }
  const toolName = data.name
  const toolConfig = getToolRenderer(toolName)
  messages.value = [
    ...messages.value,
    createMessage({
      role: 'tool_call',
      toolName,
      toolLabel: toolConfig.label,
      icon: toolConfig.icon,
      status: 'running',
      args: data.args || {},
      result: null,
      resultSummary: ''
    })
  ]
  break
}
```

- [ ] **Step 3: Rewrite `tool_result` event handler (lines 95-125)**

Replace the current handler that creates separate `tool_result` messages. Now update the existing `tool_call` message in-place:

```js
case 'tool_result': {
  // Flush accumulated text | 刷新累积文本
  if (textBuffer.trim()) {
    messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
    textBuffer = ''
    currentResponse.value = ''
  }
  const resultToolName = data.name
  const resultConfig = getToolRenderer(resultToolName)
  const summary = resultConfig.summarize(data.result || {})
  const isError = data.result?.status === 'fail' || data.result?.error

  // Update existing tool_call message (immutable) | 不可变更新现有工具调用消息
  const statusIdx = messages.value.findIndex(
    msg => msg.role === 'tool_call' && msg.toolName === resultToolName && msg.status === 'running'
  )
  if (statusIdx !== -1) {
    messages.value = messages.value.map((msg, i) =>
      i === statusIdx
        ? {
            ...msg,
            status: isError ? 'error' : 'completed',
            result: data.result || {},
            resultSummary: isError ? (data.result?.error || '执行失败') : summary
          }
        : msg
    )
  }
  break
}
```

- [ ] **Step 4: Remove unused import**

On line 9, remove `getToolLabel` from the import since it's no longer needed:

```js
// Before
import { getToolRenderer, getToolLabel } from '@/components/agent/toolRendererRegistry'

// After
import { getToolRenderer } from '@/components/agent/toolRendererRegistry'
```

- [ ] **Step 5: Verify no remaining references to old roles**

Search the file for `tool_status` and `tool_result` role strings. There should be none remaining.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAgent.js
git commit -m "feat: rewrite SSE handlers for thinking blocks and unified tool cards"
```

---

### Task 3: Add image renderer to markdown.js

**Files:**
- Modify: `src/utils/markdown.js`

- [ ] **Step 1: Add escapeAttr helper and image renderer**

Add the `escapeAttr` helper before the renderer object, then add `image` method to the renderer:

```js
/**
 * Escape string for safe HTML attribute insertion | 转义字符串用于安全的 HTML 属性插入
 */
const escapeAttr = (s) => (s || '').replace(/[&"'<>]/g, c =>
  ({ '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' }[c])
)

// Custom renderer: open links in new tab, wrap images with add-to-canvas overlay
// 自定义渲染器：链接在新标签页打开，图片包装添加到画布覆盖层
const renderer = {
  link({ href, title, text }) {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener">${text}</a>`
  },

  image({ href, text }) {
    // Wrap all images with add-to-canvas overlay | 包装图片，添加到画布覆盖层
    const alt = text || ''
    return `<div class="md-image-wrapper" data-image-url="${escapeAttr(href)}" data-prompt="${escapeAttr(alt)}"><img src="${escapeAttr(href)}" alt="${escapeAttr(alt)}" loading="lazy" /><div class="md-image-overlay"><span class="md-prompt-text">${escapeAttr(alt)}</span><span role="button" tabindex="0" class="add-to-canvas-btn" data-action="add-to-canvas">➕ 添加到画布</span></div></div>`
  }
}
```

- [ ] **Step 2: Update DOMPurify config**

Update `PURIFY_CONFIG` to allow the new data attributes and role/tabindex:

```js
// Before
const PURIFY_CONFIG = {
  ADD_ATTR: ['target', 'rel']
}

// After
const PURIFY_CONFIG = {
  ADD_ATTR: ['target', 'rel', 'data-image-url', 'data-prompt', 'data-action', 'role', 'tabindex']
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/markdown.js
git commit -m "feat: add markdown image renderer with add-to-canvas overlay"
```

---

### Task 4: Rewrite AgentPanel.vue template and script

**Files:**
- Modify: `src/components/AgentPanel.vue`

This is the largest task. It modifies template, script, and CSS sections.

- [ ] **Step 1: Update imports — remove ToolStatusCard, add watch**

In `<script setup>` (line 126-132):

```js
// Before
import { computed, nextTick, ref, watch } from 'vue'
import { NIcon, NScrollbar } from 'naive-ui'
import { CloseOutline, SendOutline, SparklesOutline } from '@vicons/ionicons5'
import ToolStatusCard from './agent/ToolStatusCard.vue'
import MessageActions from './agent/MessageActions.vue'
import { getToolRenderer } from './agent/toolRendererRegistry'
import { renderMarkdown } from '@/utils/markdown'

// After
import { computed, nextTick, ref, watch } from 'vue'
import { NIcon, NScrollbar } from 'naive-ui'
import { CloseOutline, SendOutline, SparklesOutline } from '@vicons/ionicons5'
import MessageActions from './agent/MessageActions.vue'
import { getToolRenderer } from './agent/toolRendererRegistry'
import { renderMarkdown } from '@/utils/markdown'
```

- [ ] **Step 2: Add expandedIds state and toggle/helper methods**

After the `canSend` computed (line 176), add:

```js
// Track which message IDs are expanded | 追踪展开的消息 ID
const expandedIds = ref(new Set())

// Toggle expand/collapse for thinking blocks and tool cards | 切换展开/折叠
const toggleExpanded = (msgId) => {
  const next = new Set(expandedIds.value)
  if (next.has(msgId)) {
    next.delete(msgId)
  } else {
    next.add(msgId)
  }
  expandedIds.value = next
}

// Truncate thinking content for summary display | 截断思考内容用于摘要显示
const thinkingSummary = (content) => {
  const firstLine = (content || '').split('\n')[0]
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine
}
```

- [ ] **Step 3: Add auto-expand/collapse watcher for tool cards**

After the existing watchers (after line 258), add:

```js
// Auto-expand running tool cards, auto-collapse on completion | 自动展开运行中的工具卡片，完成后折叠
watch(
  () => props.messages,
  (msgs) => {
    const next = new Set(expandedIds.value)
    for (const msg of msgs) {
      if (msg.role === 'tool_call') {
        if (msg.status === 'running') {
          next.add(msg.id)
        } else if (msg.status === 'completed' || msg.status === 'error') {
          next.delete(msg.id)
        }
      }
    }
    expandedIds.value = next
  },
  { deep: true }
)
```

- [ ] **Step 4: Add event delegation for markdown image add-to-canvas**

After `handleRegenerate` (line 233), add:

```js
// Event delegation for markdown image add-to-canvas buttons | 事件委托：Markdown 图片添加到画布按钮
const handleMessagesClick = (e) => {
  const btn = e.target.closest('[data-action="add-to-canvas"]')
  if (!btn) return
  const wrapper = btn.closest('.md-image-wrapper')
  if (!wrapper) return
  const imageUrl = wrapper.dataset.imageUrl
  const prompt = wrapper.dataset.prompt || ''
  emit('add-to-canvas', { pic_url: imageUrl, prompt })
}
```

- [ ] **Step 5: Add @click handler to messages-inner**

In the template, update the `.messages-inner` div (line 25):

```html
<!-- Before -->
<div class="messages-inner">

<!-- After -->
<div class="messages-inner" @click="handleMessagesClick">
```

- [ ] **Step 6: Replace template — remove tool_status/tool_result, add thinking + tool_call**

Replace the message rendering block (lines 36-77) with the new template. Full replacement for the `v-for` contents:

```html
<!-- Message list | 消息列表 -->
<div
  v-for="msg in messages"
  :key="msg.id"
  class="message-wrapper"
  :class="[`message-${msg.role}`]"
>
  <!-- User message | 用户消息 -->
  <div v-if="msg.role === 'user'" class="message-bubble user-bubble">
    <p class="message-text">{{ msg.content }}</p>
  </div>

  <!-- Thinking block (collapsible) | 思考块（可折叠） -->
  <div v-else-if="msg.role === 'thinking'" class="thinking-block">
    <div
      class="thinking-toggle"
      :class="{ expanded: expandedIds.has(msg.id) }"
      @click="toggleExpanded(msg.id)"
    >
      <span class="brain-icon">🧠</span>
      <span class="thinking-summary">思考中 · {{ thinkingSummary(msg.content) }}</span>
      <span class="thinking-arrow">▶</span>
    </div>
    <Transition name="thinking-expand">
      <div v-if="expandedIds.has(msg.id)" class="thinking-content">
        {{ msg.content }}
      </div>
    </Transition>
  </div>

  <!-- Assistant text message with hover actions | AI 文本消息带悬浮操作 -->
  <div v-else-if="msg.role === 'assistant'" class="message-hover-container">
    <div class="message-bubble assistant-bubble">
      <div class="message-text markdown-body" v-html="renderMarkdown(msg.content)"></div>
    </div>
    <MessageActions
      :content="msg.content"
      @regenerate="handleRegenerate(msg.id)"
    />
  </div>

  <!-- Unified tool card (collapsible) | 统一工具卡片（可折叠） -->
  <div v-else-if="msg.role === 'tool_call'" class="tool-card" :class="`status-${msg.status}`">
    <div
      class="tool-card-header"
      :class="[`status-${msg.status}`, { expanded: expandedIds.has(msg.id) }]"
      @click="toggleExpanded(msg.id)"
    >
      <div v-if="msg.status === 'running'" class="tool-spinner"></div>
      <span v-else-if="msg.status === 'error'" class="tool-error-icon">✕</span>
      <span v-else class="tool-icon-emoji">{{ msg.icon }}</span>
      <span class="tool-label">{{ msg.status === 'running' ? `正在${msg.toolLabel}...` : msg.toolLabel }}</span>
      <span class="tool-status-badge" :class="msg.status">
        {{ msg.status === 'running' ? '执行中' : msg.status === 'error' ? '失败' : `✓ ${msg.resultSummary}` }}
      </span>
      <span class="tool-arrow">▶</span>
    </div>
    <Transition name="tool-expand">
      <div v-if="expandedIds.has(msg.id)" class="tool-card-body">
        <div v-if="msg.args && Object.keys(msg.args).length" class="tool-args">
          <code v-for="(val, key) in msg.args" :key="key" class="tool-arg-line">
            {{ key }}: {{ typeof val === 'string' ? val : JSON.stringify(val) }}
          </code>
        </div>
        <div v-if="msg.result" class="tool-result-inner">
          <component
            :is="getToolRenderer(msg.toolName).component"
            :data="msg.result"
            @add-to-canvas="handleAddToCanvas"
          />
        </div>
      </div>
    </Transition>
  </div>
</div>
```

- [ ] **Step 7: Commit template and script changes**

```bash
git add src/components/AgentPanel.vue
git commit -m "feat: rewrite AgentPanel template with thinking blocks and unified tool cards"
```

---

### Task 5: Rewrite AgentPanel.vue CSS

**Files:**
- Modify: `src/components/AgentPanel.vue` (style section)

- [ ] **Step 1: Replace old tool/message CSS classes**

Replace lines 394-398 (`.message-tool_status, .message-tool_result`):

```css
/* Before */
.message-assistant,
.message-tool_status,
.message-tool_result {
  justify-content: flex-start;
}

/* After */
.message-assistant,
.message-thinking,
.message-tool_call {
  justify-content: flex-start;
}
```

Remove `.message-tool-result` class (lines 443-445):

```css
/* DELETE this block */
.message-tool-result {
  width: 100%;
}
```

- [ ] **Step 2: Add thinking block CSS**

Add after the `.message-hover-container` styles:

```css
/* ============================================
   Thinking block | 思考块
   ============================================ */
.thinking-block {
  width: 100%;
  max-width: 92%;
}

.thinking-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 10px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-secondary);
  transition: all 0.2s;
  user-select: none;
}

.thinking-toggle:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
}

.brain-icon {
  font-size: 14px;
}

.thinking-summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinking-arrow {
  font-size: 10px;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.thinking-toggle.expanded .thinking-arrow {
  transform: rotate(90deg);
}

.thinking-content {
  margin-top: 6px;
  padding: 10px 14px;
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 0 0 10px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  font-style: italic;
  white-space: pre-wrap;
}

/* Thinking expand transition | 思考块展开过渡 */
.thinking-expand-enter-active,
.thinking-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.thinking-expand-enter-from,
.thinking-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
```

- [ ] **Step 3: Add unified tool card CSS**

Add after the thinking block CSS:

```css
/* ============================================
   Unified tool card | 统一工具卡片
   ============================================ */
.tool-card {
  width: 100%;
  max-width: 92%;
}

.tool-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.tool-card-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.tool-card-header.status-running {
  border-color: rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.06);
}

.tool-card-header.status-completed {
  border-color: rgba(74, 222, 128, 0.2);
  background: rgba(74, 222, 128, 0.06);
}

.tool-card-header.status-error {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.06);
}

.tool-card-header.expanded {
  border-radius: 10px 10px 0 0;
}

.tool-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(139, 92, 246, 0.2);
  border-top-color: rgb(139, 92, 246);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tool-icon-emoji {
  font-size: 16px;
  flex-shrink: 0;
}

.tool-error-icon {
  font-size: 16px;
  color: #ef4444;
  flex-shrink: 0;
}

.tool-label {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  color: var(--text-primary);
}

.tool-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
}

.tool-status-badge.running {
  background: rgba(139, 92, 246, 0.15);
  color: rgb(139, 92, 246);
}

.tool-status-badge.completed {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.tool-status-badge.error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.tool-arrow {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.tool-card-header.expanded .tool-arrow {
  transform: rotate(90deg);
}

.tool-card-body {
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 10px 10px;
  overflow: hidden;
}

.status-completed .tool-card-body {
  border-color: rgba(74, 222, 128, 0.2);
}

.status-error .tool-card-body {
  border-color: rgba(239, 68, 68, 0.2);
}

.tool-args {
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-arg-line {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  display: block;
  word-break: break-all;
}

.tool-result-inner {
  padding: 12px 14px;
}

/* Tool expand transition | 工具卡片展开过渡 */
.tool-expand-enter-active,
.tool-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.tool-expand-enter-from,
.tool-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
```

- [ ] **Step 4: Add markdown image overlay CSS**

Add after the tool card CSS:

```css
/* ============================================
   Markdown image add-to-canvas overlay | Markdown 图片添加到画布覆盖层
   ============================================ */
.markdown-body :deep(.md-image-wrapper) {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  margin: 8px 0;
}

.markdown-body :deep(.md-image-wrapper img) {
  width: 100%;
  display: block;
  border-radius: 10px;
}

.markdown-body :deep(.md-image-overlay) {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  justify-content: space-between;
  opacity: 0;
  transition: opacity 0.2s;
}

.markdown-body :deep(.md-image-wrapper:hover .md-image-overlay) {
  opacity: 1;
}

.markdown-body :deep(.md-prompt-text) {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.markdown-body :deep(.add-to-canvas-btn) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: var(--accent-color);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
  flex-shrink: 0;
}

.markdown-body :deep(.add-to-canvas-btn:hover) {
  background: var(--accent-hover);
}
```

- [ ] **Step 5: Commit CSS changes**

```bash
git add src/components/AgentPanel.vue
git commit -m "feat: add CSS for thinking blocks, tool cards, and image overlays"
```

---

### Task 6: Delete ToolStatusCard.vue

**Files:**
- Delete: `src/components/agent/ToolStatusCard.vue`

- [ ] **Step 1: Delete the file**

```bash
git rm src/components/agent/ToolStatusCard.vue
```

- [ ] **Step 2: Verify no remaining imports**

Search for `ToolStatusCard` across the codebase. After Task 4 Step 1, AgentPanel.vue should no longer import it. Verify:

```bash
grep -r "ToolStatusCard" src/
```

Expected: no results.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete ToolStatusCard.vue, absorbed into AgentPanel tool card"
```

---

### Task 7: Manual verification

No test framework available. Verify manually:

- [ ] **Step 1: Start dev server**

```bash
cd lumen-canvas && pnpm dev
```

Open the app in Chrome, open the Agent panel.

- [ ] **Step 2: Verify thinking blocks**

Send a message to the agent. Observe:
- 🧠 thinking block appears with purple-tinted background
- Default state is collapsed (only toggle bar visible)
- Clicking toggle expands to show full thinking text
- Arrow rotates 90° when expanded
- Multiple consecutive thinking events accumulate into one block

- [ ] **Step 3: Verify unified tool cards**

Trigger a tool call (e.g. "搜索赛博朋克图片"). Observe:
- Single card appears with spinner + "执行中" badge while running
- Card is auto-expanded during execution
- On completion: spinner → emoji icon, badge → "✓ {summary}", auto-collapses
- Clicking header toggles expand/collapse
- Expanded body shows args (monospace) and result renderer

- [ ] **Step 4: Verify markdown image add-to-canvas**

If agent response includes a markdown image (from generate_image tool), observe:
- Image renders in assistant bubble
- Hovering shows gradient overlay with prompt text + "➕ 添加到画布" button
- Clicking button triggers add-to-canvas action (check console or canvas for new node)

- [ ] **Step 5: Verify dark mode**

Toggle dark mode. All new components should render correctly with CSS variables.

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address visual issues found during manual verification"
```
