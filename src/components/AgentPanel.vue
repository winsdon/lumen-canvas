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
            v-for="(msg, index) in messages"
            :key="index"
            class="message-wrapper"
            :class="[`message-${msg.role}`]"
          >
            <!-- User message (right-aligned bubble) | 用户消息（右对齐气泡） -->
            <div v-if="msg.role === 'user'" class="message-bubble user-bubble">
              <p class="message-text">{{ msg.content }}</p>
            </div>

            <!-- Assistant text message (left-aligned) | AI 文本消息（左对齐） -->
            <div v-else-if="msg.role === 'assistant'" class="message-bubble assistant-bubble">
              <p class="message-text" v-html="formatMessage(msg.content)"></p>
            </div>

            <!-- Image cards message | 图片卡片消息 -->
            <div v-else-if="msg.role === 'image_cards'" class="message-cards">
              <ImageCardMessage
                :cards="msg.cards"
                @add-to-canvas="handleAddToCanvas"
              />
            </div>
          </div>

          <!-- Loading indicator (three bouncing dots) | 加载动画（三个跳动的点） -->
          <div v-if="loading" class="message-wrapper message-assistant">
            <div class="message-bubble assistant-bubble loading-bubble">
              <div class="typing-dots">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            </div>
          </div>

          <!-- Streaming response | 流式响应 -->
          <div v-if="currentResponse" class="message-wrapper message-assistant">
            <div class="message-bubble assistant-bubble">
              <p class="message-text" v-html="formatMessage(currentResponse)"></p>
            </div>
          </div>
        </div>
      </n-scrollbar>

      <!-- Input area (fixed bottom) | 输入区域（固定底部） -->
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
import ImageCardMessage from './agent/ImageCardMessage.vue'

// Props | 属性
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  // Message list from parent/hook | 从父组件或 hook 传入的消息列表
  messages: {
    type: Array,
    default: () => []
  },
  // Loading state | 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // Streaming response text | 流式响应文本
  currentResponse: {
    type: String,
    default: ''
  }
})

// Emits | 事件
const emit = defineEmits([
  'update:show',
  'send',
  'add-to-canvas'
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
 * Format message text (basic markdown-like) | 格式化消息文本（基础 markdown）
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

/**
 * Handle keyboard events | 处理键盘事件
 * Enter to send, Shift+Enter for newline | Enter 发送，Shift+Enter 换行
 */
const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

/**
 * Send message | 发送消息
 */
const handleSend = () => {
  const text = inputText.value.trim()
  if (!text || props.loading) return

  emit('send', text)
  inputText.value = ''

  // Reset textarea height | 重置输入框高度
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
    }
  })
}

/**
 * Auto-resize textarea | 自动调整输入框高度
 */
const autoResize = () => {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

/**
 * Scroll to bottom of message list | 滚动到消息列表底部
 */
const scrollToBottom = () => {
  nextTick(() => {
    if (scrollbarRef.value) {
      scrollbarRef.value.scrollTo({ top: 999999, behavior: 'smooth' })
    }
  })
}

/**
 * Handle add image card to canvas | 处理添加图片卡片到画布
 */
const handleAddToCanvas = (card) => {
  emit('add-to-canvas', card)
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

/* ============================================
   Slide animation (from right) | 滑入动画（从右侧）
   ============================================ */
.agent-slide-enter-active,
.agent-slide-leave-active {
  transition: all 0.25s ease;
}

.agent-slide-enter-from,
.agent-slide-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

/* ============================================
   Header | 头部
   ============================================ */
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
  transition:
    background 0.2s,
    color 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* ============================================
   Messages area | 消息区域
   ============================================ */
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

/* ============================================
   Message bubbles | 消息气泡
   ============================================ */
.message-wrapper {
  display: flex;
  max-width: 100%;
}

.message-user {
  justify-content: flex-end;
}

.message-assistant,
.message-image_cards {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 14px;
  word-break: break-word;
}

/* User bubble (right-aligned, accent background) | 用户气泡（右对齐，强调色背景） */
.user-bubble {
  background: var(--accent-color);
  color: #fff;
  border-bottom-right-radius: 4px;
}

/* Assistant bubble (left-aligned, tertiary background) | AI 气泡（左对齐，三级背景色） */
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

/* Image cards message | 图片卡片消息 */
.message-cards {
  width: 100%;
}

/* ============================================
   Loading dots animation | 加载动画（三点跳动）
   ============================================ */
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

.dot:nth-child(2) {
  animation-delay: 0.16s;
}

.dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* ============================================
   Input area | 输入区域
   ============================================ */
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
  transition:
    background 0.2s,
    transform 0.15s,
    opacity 0.2s;
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
