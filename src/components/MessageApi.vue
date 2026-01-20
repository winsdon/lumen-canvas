<template>
  <div></div>
</template>

<script setup>
import { useMessage } from 'naive-ui'
import { onMounted } from 'vue'

const message = useMessage()

onMounted(() => {
  window.$message = message
})
</script>
