<template>
  <div 
    class="group-node-container relative w-full h-full rounded-lg border border-[var(--xy-selection-background-color,rgba(0,89,220,0.08))]"
    :style="{ backgroundColor: 'var(--xy-selection-background-color, rgba(0, 89, 220, 0.08))' }"
    @mouseenter="showUngroup = true"
    @mouseleave="showUngroup = false"
  >
    <!-- Ungroup Button | 解组按钮 -->
    <div 
      v-if="showUngroup"
      class="absolute -top-10 left-1/2 -translate-x-1/2 z-50 pt-2 pb-2 px-4 cursor-pointer"
      @mouseenter="showUngroup = true"
    >
      <button 
        @click.stop="handleUngroup"
        class="flex items-center gap-1 px-3 py-1.5 bg-[var(--accent-color)] text-white shadow-lg rounded-full hover:bg-[var(--accent-hover)] transition-all transform hover:scale-105"
      >
        <n-icon><UnlinkOutline /></n-icon>
        <span class="text-xs font-medium">解组</span>
      </button>
    </div>
    
    <!-- Content slot (though children are rendered independently by Vue Flow) -->
    <slot></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { NIcon } from 'naive-ui'
import { UnlinkOutline } from '@vicons/ionicons5'
import { ungroupNodes } from '@/stores/canvas'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({})
  }
})

const showUngroup = ref(false)

const handleUngroup = () => {
  ungroupNodes(props.id)
}
</script>

<style scoped>
.group-node-container {
  /* Ensure it captures mouse events for dragging */
  pointer-events: all;
  min-width: 100px;
  min-height: 100px;
}
</style>
