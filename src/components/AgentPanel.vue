<template>
  <!-- Agent chat panel (right sidebar) | AI 对话智能体面板（右侧边栏） -->
  <Transition name="agent-slide">
    <div
      v-if="visible"
      class="agent-panel"
      @mousedown.stop
      @click.stop
    >
      <!-- Header | 头部 -->
      <div class="agent-header">
        <div class="agent-title">
          <n-icon :size="20" class="title-icon">
            <SparklesOutline />
          </n-icon>
          <span>创意助手</span>
        </div>
        <button class="close-btn" @click="visible = false">
          <n-icon :size="16"><CloseOutline /></n-icon>
        </button>
      </div>

      <!-- Messages area (scrollable) | 消息列表（可滚动区域） -->
      <n-scrollbar ref="scrollbarRef" class="agent-messages">
        <div class="messages-inner">
          <!-- Empty state | 空状态 -->
          <div v-if="messages.length === 0 && !loading" class="empty-state">
            <n-icon :size="40" class="empty-icon">
              <SparklesOutline />
            </n-icon>
            <p class="empty-title">你好，我是创意助手</p>
            <p class="empty-desc">描述你想要的创意内容，我可以帮你生成图片、优化提示词或提供灵感</p>
          </div>

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

            <!-- Tool status card | 工具状态卡片 -->
            <div v-else-if="msg.role === 'tool_status'">
              <ToolStatusCard
                :tool-name="msg.toolName"
                :tool-label="msg.toolLabel"
                :status="msg.status"
                :icon="msg.icon"
                :result-summary="msg.resultSummary"
              />
            </div>

            <!-- Tool result (dynamic component from registry) | 工具结果（注册表动态组件） -->
            <div v-else-if="msg.role === 'tool_result'" class="message-tool-result">
              <component
                :is="getToolRenderer(msg.toolName).component"
                :data="msg.data"
                @add-to-canvas="handleAddToCanvas"
              />
            </div>
          </div>

          <!-- Loading indicator | 加载动画 -->
          <div v-if="loading && !currentResponse" class="message-wrapper message-assistant">
            <div class="message-bubble assistant-bubble loading-bubble">
              <div class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>
          </div>

          <!-- Streaming response (uses lightweight regex, not marked) | 流式响应（使用轻量正则） -->
          <div v-if="currentResponse" class="message-wrapper message-assistant">
            <div class="message-bubble assistant-bubble">
              <p class="message-text" v-html="formatMessage(currentResponse)"></p>
            </div>
          </div>
        </div>
      </n-scrollbar>

      <!-- Input area | 输入区域 -->
      <div class="agent-input-area">
        <div class="input-wrapper">
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="agent-input"
            placeholder="输入消息..."
            rows="1"
            @keydown="handleKeydown"
            @input="autoResize"
          ></textarea>
          <button
            class="send-btn"
            :class="{ disabled: !canSend }"
            :disabled="!canSend"
            @click="handleSend"
          >
            <n-icon :size="18"><SendOutline /></n-icon>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { NIcon, NScrollbar } from 'naive-ui'
import { CloseOutline, SendOutline, SparklesOutline } from '@vicons/ionicons5'
import ToolStatusCard from './agent/ToolStatusCard.vue'
import MessageActions from './agent/MessageActions.vue'
import { getToolRenderer } from './agent/toolRendererRegistry'
import { renderMarkdown } from '@/utils/markdown'

// Props | 属性
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  messages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  currentResponse: {
    type: String,
    default: ''
  }
})

// Emits | 事件
const emit = defineEmits([
  'update:show',
  'send',
  'add-to-canvas',
  'regenerate'
])

// Two-way binding for show | show 双向绑定
const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

// Refs | 引用
const scrollbarRef = ref(null)
const inputRef = ref(null)
const inputText = ref('')

// Computed: can send | 计算属性：是否可发送
const canSend = computed(() => {
  return inputText.value.trim().length > 0 && !props.loading
})

/**
 * Lightweight format for streaming text (basic markdown-like) | 流式文本轻量格式化
 * Used only for currentResponse during streaming, not for completed messages.
 */
const formatMessage = (text) => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const handleSend = () => {
  const text = inputText.value.trim()
  if (!text || props.loading) return
  emit('send', text)
  inputText.value = ''
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
    }
  })
}

const autoResize = () => {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollbarRef.value) {
      scrollbarRef.value.scrollTo({ top: 999999, behavior: 'smooth' })
    }
  })
}

const handleAddToCanvas = (card) => {
  emit('add-to-canvas', card)
}

const handleRegenerate = (msgId) => {
  emit('regenerate', msgId)
}

// Auto-scroll when messages change | 消息变化时自动滚动
watch(
  () => props.messages.length,
  () => scrollToBottom()
)

// Auto-scroll during streaming | 流式响应时自动滚动
watch(
  () => props.currentResponse,
  () => scrollToBottom()
)

// Focus input when panel opens | 面板打开时聚焦输入框
watch(
  () => visible.value,
  (val) => {
    if (val) {
      nextTick(() => {
        inputRef.value?.focus()
        scrollToBottom()
      })
    }
  }
)
</script>

<style scoped>
/* ============================================
   Panel container | 面板容器
   ============================================ */
.agent-panel {
  position: fixed;
  right: 16px;
  top: 64px;
  width: 400px;
  height: calc(100vh - 80px);
  background: var(--bg-secondary);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:global(.dark) .agent-panel {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* Slide animation | 滑入动画 */
.agent-slide-enter-active,
.agent-slide-leave-active {
  transition: all 0.25s ease;
}

.agent-slide-enter-from,
.agent-slide-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

/* Header | 头部 */
.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.agent-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.title-icon {
  color: var(--accent-color);
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.2s, color 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Messages area | 消息区域 */
.agent-messages {
  flex: 1;
  min-height: 0;
}

.messages-inner {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Empty state | 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  color: var(--accent-color);
  opacity: 0.6;
  margin-bottom: 16px;
}

.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  max-width: 280px;
}

/* Message layout | 消息布局 */
.message-wrapper {
  display: flex;
  max-width: 100%;
}

.message-user {
  justify-content: flex-end;
}

.message-assistant,
.message-tool_status,
.message-tool_result {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 14px;
  word-break: break-word;
}

.user-bubble {
  background: var(--accent-color);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.assistant-bubble {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.message-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

:global(.dark) .message-text :deep(code) {
  background: rgba(255, 255, 255, 0.1);
}

/* Hover container for message actions | 消息操作悬浮容器 */
.message-hover-container {
  max-width: 85%;
}

/* Tool result container | 工具结果容器 */
.message-tool-result {
  width: 100%;
}

/* ============================================
   Markdown body styles | Markdown 正文样式
   ============================================ */
.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 4px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 2px 0;
}

.markdown-body :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 13px;
  line-height: 1.5;
}

:global(.dark) .markdown-body :deep(pre) {
  background: rgba(255, 255, 255, 0.06);
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--accent-color);
  margin: 8px 0;
  padding: 4px 12px;
  color: var(--text-secondary);
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
  width: 100%;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border-color);
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--bg-secondary);
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: var(--accent-color);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 12px 0;
}

/* Loading dots | 加载动画 */
.loading-bubble {
  padding: 12px 18px;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 20px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: dot-bounce 1.4s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.16s; }
.dot:nth-child(3) { animation-delay: 0.32s; }

@keyframes dot-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* Input area | 输入区域 */
.agent-input-area {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 8px 8px 14px;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: var(--accent-color);
}

.agent-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  min-height: 22px;
  max-height: 120px;
  font-family: inherit;
}

.agent-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.send-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: none;
  background: var(--accent-color);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s, opacity 0.2s;
}

.send-btn:hover:not(.disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.send-btn:active:not(.disabled) {
  transform: scale(0.95);
}

.send-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
