# Agent Panel Redesign — Design Spec

## Overview

Redesign the Agent chat panel output to provide richer, more interactive feedback. Three core changes:

1. **Thinking blocks** — Display LLM reasoning as collapsible blocks (default collapsed)
2. **Merged tool cards** — Combine `tool_status` + `tool_result` into a single collapsible card
3. **Markdown image add-to-canvas** — Auto-detect generated image URLs in markdown and show "add to canvas" overlay

## Current State

### Message Types in `useAgent.js`

| role | Description | Rendered by |
|------|-------------|-------------|
| `user` | User input | `.user-bubble` |
| `assistant` | LLM text output | `.assistant-bubble` + `renderMarkdown()` |
| `tool_status` | Tool call indicator (running/completed) | `ToolStatusCard.vue` |
| `tool_result` | Tool execution result | Dynamic component from `toolRendererRegistry.js` |

### SSE Event Flow

```
Agent backend → SSEEventCollector (asyncio.Queue) → EventSourceResponse
→ fetch ReadableStream → useAgent.js event handlers
```

Events: `thinking`, `tool_call`, `tool_result`, `text`, `done`, `error`, `draft_created`, `draft_updated`

### Current Issues

- `thinking` events are **ignored** (`// Ignored in this iteration`)
- `tool_status` and `tool_result` render as **separate, unlinked** messages
- Generated images in assistant markdown have **no "add to canvas" action**

---

## Design: Thinking Blocks

### Behavior

- Render `thinking` events as collapsible blocks in the message list
- **Default state: collapsed** — shows only a summary toggle bar
- User can click to expand and see full reasoning text
- Multiple consecutive thinking events accumulate into one block

### Message Data Shape

```js
{
  id: Number,
  role: 'thinking',
  content: String      // Accumulated thinking text
}
```

> **Note:** `expanded` state is managed locally in `AgentPanel.vue` via a `Set<number>`, not in the message data. This follows SRP — view-layer state stays in the view component, not in the business data model.

### useAgent.js Changes

In the `thinking` event handler (currently a no-op):

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
    messages.value = [
      ...messages.value,
      createMessage({ role: 'thinking', content: data.content || '' })
    ]
  }
  break
}
```

### AgentPanel.vue Rendering

Add a new `v-else-if` branch for `thinking` role:

```html
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
```

### Helper Function

```js
// Truncate thinking content for summary display | 截断思考内容用于摘要显示
const thinkingSummary = (content) => {
  const firstLine = (content || '').split('\n')[0]
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine
}
```

### Visual Design

Thinking blocks use a **dedicated purple** palette (independent of `--accent-color`), matching the design mockup:

- **Toggle bar**: `background: rgba(139, 92, 246, 0.06)`, `border: 1px solid rgba(139, 92, 246, 0.2)`, rounded 10px
- **Icon**: 🧠 emoji, 14px
- **Summary**: Truncated first line of thinking text, 12.5px, `var(--text-secondary)`
- **Arrow**: ▶ rotates 90° when expanded
- **Content**: Same purple-tinted background, italic, 12px, `var(--text-secondary)`, slides down with CSS transition

### Transition CSS

```css
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

---

## Design: Merged Tool Cards

### Behavior

Replace separate `tool_status` + `tool_result` messages with a **single unified message** per tool call:

1. When `tool_call` event arrives → insert message with `role: 'tool_call'`, `status: 'running'`
2. When `tool_result` event arrives → update same message: `status: 'completed'`, attach `result` data
3. The card is **collapsible**: collapsed shows header (icon + label + status badge), expanded shows args + result renderer

### Message Data Shape (Unified)

```js
{
  id: Number,
  role: 'tool_call',       // Single role replaces tool_status + tool_result
  toolName: String,
  toolLabel: String,
  icon: String,
  status: 'running' | 'completed' | 'error',
  args: Object,            // Tool call arguments
  result: Object | null,   // Tool result data (null while running)
  resultSummary: String
}
```

> **Note:** `expanded` state is managed locally in `AgentPanel.vue` via a `Set<number>`, not in the message data. Running tool cards are auto-expanded by adding their id to the set on creation; on completion, they are removed from the set (auto-collapse).

### useAgent.js Changes

**`tool_call` handler** (replaces current tool_status insertion):

```js
case 'tool_call': {
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

**`tool_result` handler** (replaces current dual-update + append logic):

```js
case 'tool_result': {
  if (textBuffer.trim()) {
    messages.value = [...messages.value, createMessage({ role: 'assistant', content: textBuffer })]
    textBuffer = ''
    currentResponse.value = ''
  }
  const resultToolName = data.name
  const resultConfig = getToolRenderer(resultToolName)
  const summary = resultConfig.summarize(data.result || {})

  // Update existing tool_call message in-place (immutable) | 不可变更新现有工具调用消息
  const statusIdx = messages.value.findIndex(
    msg => msg.role === 'tool_call' && msg.toolName === resultToolName && msg.status === 'running'
  )
  if (statusIdx !== -1) {
    messages.value = messages.value.map((msg, i) =>
      i === statusIdx
        ? {
            ...msg,
            status: 'completed',
            result: data.result || {},
            resultSummary: summary
          }
        : msg
    )
  }
  break
}
```

Key difference from current: **no separate `tool_result` message is appended**. Result data lives inside the `tool_call` message.

### AgentPanel.vue Rendering

Replace both `tool_status` and `tool_result` blocks with:

```html
<div v-else-if="msg.role === 'tool_call'" class="tool-card">
  <!-- Header (always visible) | 头部（始终可见） -->
  <div
    class="tool-card-header"
    :class="[`status-${msg.status}`, { expanded: expandedIds.has(msg.id) }]"
    @click="toggleExpanded(msg.id)"
  >
    <div v-if="msg.status === 'running'" class="tool-spinner"></div>
    <span v-else-if="msg.status === 'error'" class="tool-error-icon">✕</span>
    <span v-else class="tool-icon">{{ msg.icon }}</span>
    <span class="tool-label">{{ msg.status === 'running' ? `正在${msg.toolLabel}...` : msg.toolLabel }}</span>
    <span class="tool-status-badge" :class="msg.status">
      {{ msg.status === 'running' ? '执行中' : msg.status === 'error' ? '失败' : `✓ ${msg.resultSummary}` }}
    </span>
    <span class="tool-arrow">▶</span>
  </div>

  <!-- Body (collapsible) | 内容（可折叠） -->
  <Transition name="tool-expand">
    <div v-if="expandedIds.has(msg.id)" class="tool-card-body">
      <!-- Args section | 参数区 -->
      <div v-if="msg.args && Object.keys(msg.args).length" class="tool-args">
        <code v-for="(val, key) in msg.args" :key="key">
          {{ key }}: {{ JSON.stringify(val) }}
        </code>
      </div>
      <!-- Result section (dynamic renderer) | 结果区（动态渲染器） -->
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
```

### Visual Design

**Header states:**

| State | Border | Background | Left indicator |
|-------|--------|------------|----------------|
| `running` | `rgba(139, 92, 246, 0.3)` | `rgba(139, 92, 246, 0.06)` | CSS spinner |
| `completed` | `rgba(74, 222, 128, 0.2)` | `rgba(74, 222, 128, 0.06)` | Tool emoji icon |
| `error` | `rgba(239, 68, 68, 0.2)` | `rgba(239, 68, 68, 0.06)` | ✕ icon |

**Body:**
- Connected to header (no gap, shared border, bottom-only border-radius)
- Args: dark code block, monospace font, 11px
- Result: rendered by existing tool renderer components (no change to renderers)

---

## Design: Markdown Image Add-to-Canvas

### Behavior

When assistant markdown text contains `<img>` tags (generated by `marked`), detect those that are generated images and show an "add to canvas" overlay on hover.

### Detection Strategy: Auto-detect by URL pattern

Generated image URLs follow predictable patterns from our backend:
- Contains domain patterns from VITE_BASE_URL or known CDN
- Falls back to: any `<img>` in assistant message gets the overlay (safe default since most images in agent responses are generated)

### Implementation

**Custom `marked` renderer for images:**

In `markdown.js`, extend the renderer:

```js
const renderer = {
  link({ href, title, text }) { /* existing */ },

  image({ href, text }) {
    // Wrap generated images with add-to-canvas overlay | 包装生成图片，添加画布覆盖层
    const escapeAttr = (s) => (s || '').replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c]))
    const alt = text || ''
    return `
      <div class="md-image-wrapper" data-image-url="${escapeAttr(href)}" data-prompt="${escapeAttr(alt)}">
        <img src="${escapeAttr(href)}" alt="${escapeAttr(alt)}" loading="lazy" />
        <div class="md-image-overlay">
          <span class="md-prompt-text">${escapeAttr(alt)}</span>
          <span role="button" tabindex="0" class="add-to-canvas-btn" data-action="add-to-canvas">➕ 添加到画布</span>
        </div>
      </div>
    `
  }
}
```

**DOMPurify config update:**

```js
const PURIFY_CONFIG = {
  ADD_ATTR: ['target', 'rel', 'data-image-url', 'data-prompt', 'data-action', 'role', 'tabindex']
  // No ADD_TAGS needed — we use <span role="button"> instead of <button> for safety
}
```

**Event delegation in AgentPanel.vue:**

Add a click handler on `.messages-inner` that catches "add-to-canvas" button clicks:

```js
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

### Visual Design

- **Wrapper**: `position: relative`, `border-radius: 10px`, `overflow: hidden`
- **Overlay**: Bottom gradient (`transparent → rgba(0,0,0,0.7)`), `opacity: 0` by default, `opacity: 1` on hover
- **Prompt text**: 11px, white 80% opacity, ellipsis overflow
- **Button**: `var(--accent-color)` background, white text, 11px, rounded 6px, `➕ 添加到画布`

---

## Expand/Collapse State Management

### Architecture Decision

`expanded` is pure **view-layer state** (not business data). It is managed locally inside `AgentPanel.vue` via a `Set<number>` — no emit to parent, no modification to `messages` array.

### AgentPanel.vue

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
```

**Auto-expand running tool cards:** When a new `tool_call` message with `status: 'running'` is detected, add its id to `expandedIds`. When status changes to `completed`, remove it. This is done via a `watch` on `messages`:

```js
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

### useAgent.js

No toggle methods needed — remove `toggleThinking` and `toggleToolCard` from the composable. No new emits to parent (`Canvas.vue`).

---

## Transition CSS (Shared)

```css
/* Shared expand/collapse transition | 共用展开/折叠过渡 */
.thinking-expand-enter-active,
.thinking-expand-leave-active,
.tool-expand-enter-active,
.tool-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.thinking-expand-enter-from,
.thinking-expand-leave-to,
.tool-expand-enter-from,
.tool-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAgent.js` | Rewrite `thinking`/`tool_call`/`tool_result` handlers; remove `tool_status`/`tool_result` message roles |
| `src/components/AgentPanel.vue` | Replace `tool_status`/`tool_result` rendering with unified `tool_call` block; add `thinking` block; add `expandedIds` Set + `toggleExpanded`; add messages click delegation; add/update CSS (remove `.message-tool_status`/`.message-tool_result`, add `.message-tool_call`/`.thinking-block`); remove `ToolStatusCard` import |
| `src/utils/markdown.js` | Add custom `image` renderer with overlay wrapper; add `escapeAttr` helper; update DOMPurify config |
| `src/components/agent/ToolStatusCard.vue` | **Delete** — functionality absorbed into AgentPanel's inline tool card |
| `src/components/agent/tool-renderers/DraftCreatedRenderer.vue` | Rename prop from `result` to `data` (fix pre-existing bug) |
| `src/components/agent/tool-renderers/ListTemplatesRenderer.vue` | Rename prop from `result` to `data` (fix pre-existing bug) |

### Files NOT Changed

| File | Reason |
|------|--------|
| `toolRendererRegistry.js` | No changes — same registry, same components |
| `tool-renderers/*.vue` | No changes — rendered inside tool card body as before |
| `app/agent/hooks.py` | No changes — SSE events already correct |
| `app/api/chat.py` | No changes — backend unchanged |

---

## CSS Variable Dependencies

Uses existing CSS custom properties from `lumen-canvas`:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`
- `--border-color`, `--accent-color`, `--accent-hover`

New inline hardcoded colors (no new CSS variables needed):
- Thinking/running purple: `rgba(139, 92, 246, ...)` — independent of `--accent-color`
- Success green: `rgba(74, 222, 128, ...)`
- Error red: `rgba(239, 68, 68, ...)`

---

## Error State Handling

When `tool_result` data contains an error indicator (e.g. `data.result?.status === 'fail'` or `data.result?.error`), update the tool_call message to `status: 'error'`:

```js
const isError = data.result?.status === 'fail' || data.result?.error
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
```

---

## Acceptance Criteria

1. Thinking blocks render as collapsible purple-tinted blocks, default collapsed
2. Tool calls show as single unified cards with running/completed/error states
3. Tool card auto-expands while running, auto-collapses on completion
4. Tool card expands to show args and result renderer on click
5. Markdown images in assistant messages show "add to canvas" overlay on hover
6. Clicking "add to canvas" emits event with image URL and prompt
7. All message state updates follow immutable pattern (no direct mutation)
8. Expand/collapse state managed locally in AgentPanel (not in message data)
9. Existing tool renderer components work unchanged inside new card body
10. DraftCreatedRenderer and ListTemplatesRenderer prop mismatch fixed
11. No `<button>` tags in sanitized markdown output (use `<span role="button">`)
12. Dark mode / light mode both render correctly via CSS variables
