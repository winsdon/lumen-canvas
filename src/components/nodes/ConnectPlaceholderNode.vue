<template>
  <div class="w-px h-px opacity-0 pointer-events-none relative">
    <Handle type="target" :position="Position.Left" id="left" class="!bg-transparent !border-transparent" />
    <Handle type="source" :position="Position.Right" id="right" class="!bg-transparent !border-transparent" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  id: String,
  data: Object
})
</script>

