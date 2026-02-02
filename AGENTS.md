# AGENTS.md - AI Canvas (Lumen Canvas)

> AI 编码代理在此仓库工作的指南。

## 项目概述

AI Canvas 是一个基于 Vue 3 + Vite + Vue Flow 构建的可视化 AI 创作画布。支持文生图、图生视频、分镜工作流的节点式编排。

**技术栈：**
- Vue 3.5（Composition API + `<script setup>`）
- Vite 5.2
- Vue Flow（节点画布）
- Naive UI（组件库）
- Tailwind CSS（样式）
- Axios（HTTP 客户端）

## 构建 / 开发 / 检查命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

**未配置测试框架。** 无 ESLint/Prettier 配置文件。

## 项目结构

```
src/
├── api/              # API 层（image.js, video.js, chat.js）
├── components/       # Vue 组件
│   ├── nodes/        # 画布节点组件（TextNode, ImageNode 等）
│   └── edges/        # 画布连线组件
├── config/           # 配置（models.js, workflows.js）
├── hooks/            # 组合式函数（useApi.js, useWorkflowOrchestrator.js）
├── router/           # Vue Router 配置
├── stores/           # 状态管理（canvas.js, projects.js, theme.js）
├── utils/            # 工具函数（request.js, constants.js）
└── views/            # 页面组件（Home.vue, Canvas.vue）
```

## 代码风格指南

### 通用模式

1. **仅使用 Composition API**：始终使用 `<script setup>` 语法
2. **不使用 TypeScript**：项目使用纯 JavaScript（`.js`, `.vue`）
3. **双语注释**：使用 英文 | 中文 注释格式
   ```js
   // Update content in store | 更新存储中的内容
   const updateContent = () => { ... }
   ```

### Vue 组件模板

```vue
<template>
  <!-- Component description | 组件描述 -->
  <div class="...">
    ...
  </div>
</template>

<script setup>
/**
 * Component Name | 组件名称
 * 组件功能简述
 */
import { ref, computed, watch } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { NIcon, NDropdown } from 'naive-ui'
import { SomeIcon } from '@vicons/ionicons5'
import { someFunction } from '@/stores/canvas'

// Props 定义
const props = defineProps({
  id: String,
  data: Object
})

// 本地状态 | Local state
const localValue = ref(props.data?.value || '')

// 计算属性 | Computed properties
const displayValue = computed(() => ...)

// 方法 | Methods
const handleAction = () => { ... }
</script>

<style scoped>
.component-class {
  /* 样式 */
}
</style>
```

### 导入顺序

1. Vue 核心（`ref`, `computed`, `watch`, `onMounted`）
2. Vue Flow（`Handle`, `Position`, `useVueFlow`）
3. Naive UI 组件
4. `@vicons/ionicons5` 图标
5. 本地 stores/hooks/utils（使用 `@/` 别名）
6. 本地组件

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `TextNode.vue`, `ImageConfigNode.vue` |
| 组合式函数 | camelCase + `use` 前缀 | `useApi`, `useWorkflowOrchestrator` |
| Store 导出 | camelCase | `nodes`, `addNode`, `updateNode` |
| 常量 | SCREAMING_SNAKE_CASE | `WORKFLOW_TYPES`, `DEFAULT_IMAGE_MODEL` |
| CSS 类名 | kebab-case | `.text-node-wrapper` |

### 状态管理

本项目使用 **从 store 模块导出的 Vue refs**（非 Pinia/Vuex）：

```js
// stores/canvas.js
export const nodes = ref([])
export const edges = ref([])

export const addNode = (type, position, data) => { ... }
export const updateNode = (id, data) => { ... }
export const removeNode = (id) => { ... }
```

**在组件中使用：**
```js
import { nodes, addNode, updateNode } from '@/stores/canvas'
```

### 组合式函数模式

```js
// hooks/useApi.js
export const useApiState = () => {
  const loading = ref(false)
  const error = ref(null)
  const status = ref('idle')
  
  const setLoading = (isLoading) => { ... }
  const setError = (err) => { ... }
  
  return { loading, error, status, setLoading, setError }
}

export const useImageGeneration = () => {
  const { loading, error, status, ... } = useApiState()
  const images = ref([])
  
  const generate = async (params) => { ... }
  
  return { loading, error, status, images, generate }
}
```

### API 层

```js
// api/image.js
import { request } from '@/utils'

export const generateImage = (data, options = {}) => {
  const { endpoint = '/images/generations' } = options
  return request({
    url: endpoint,
    method: 'post',
    data
  })
}
```

### 样式规范

1. **Tailwind CSS** 用于工具类
2. **CSS 变量** 用于主题：
   - `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-tertiary)`
   - `var(--text-primary)`, `var(--text-secondary)`
   - `var(--border-color)`
   - `var(--accent-color)`, `var(--accent-hover)`
3. 组件中使用 **scoped 样式**
4. 深色模式通过 Tailwind 配置 `darkMode: 'class'` 实现

### 错误处理

```js
try {
  const result = await someApiCall()
  // 处理成功
} catch (err) {
  window.$message?.error(err.message || '操作失败')
  throw err
}
```

使用 `window.$message` 进行用户通知（Naive UI 的 message API）。

### 节点组件模式

画布节点遵循以下结构：

```vue
<template>
  <div class="node-wrapper" @mouseenter="showActions = true" @mouseleave="showActions = false">
    <div class="node-content bg-[var(--bg-secondary)] rounded-xl border ...">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-3 py-2 border-b ...">
        <span>{{ data.label }}</span>
        <div class="flex items-center gap-1">
          <!-- 操作按钮 -->
        </div>
      </div>
      
      <!-- 内容 -->
      <div class="p-3">
        <!-- 节点特定内容 -->
      </div>
      
      <!-- 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" />
      <Handle type="source" :position="Position.Right" id="right" />
    </div>
    
    <!-- 悬浮操作 -->
    <div v-show="showActions" class="absolute ...">
      <!-- 悬浮按钮 -->
    </div>
  </div>
</template>
```

### 关键文件索引

| 用途 | 文件 |
|------|------|
| 画布状态 | `src/stores/canvas.js` |
| API hooks | `src/hooks/useApi.js` |
| 工作流编排 | `src/hooks/useWorkflowOrchestrator.js` |
| 模型配置 | `src/config/models.js` |
| HTTP 客户端 | `src/utils/request.js` |
| 主画布视图 | `src/views/Canvas.vue` |

## 常见操作

### 添加新节点类型

1. 在 `src/components/nodes/NewNode.vue` 创建组件
2. 在 `Canvas.vue` 中注册：
   ```js
   import NewNode from '../components/nodes/NewNode.vue'
   const nodeTypes = {
     // ...已有类型
     newType: markRaw(NewNode)
   }
   ```
3. 在 `stores/canvas.js` 的 `getDefaultNodeData()` 中添加默认数据

### 添加 API 集成

1. 在 `src/api/` 中创建 API 函数
2. 在 `src/hooks/` 中创建组合式函数
3. 在组件中使用，处理好 loading/error 状态

## 重要说明

- **路径别名**：使用 `@/` 表示 `src/` 目录
- **无测试**：需要手动验证
- **中文界面**：用户界面文本为中文
- **自动保存**：画布自动保存到 localStorage
- **历史记录**：通过 `saveToHistory()` 支持撤销/重做
- 每次修改完代码不要启动项目，我会自己验证