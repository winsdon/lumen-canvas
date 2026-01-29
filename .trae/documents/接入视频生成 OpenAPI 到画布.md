## 确认信息（已收到）
- 状态码：10=排队中，20=生成中，30=已完成，40=已失败，50=已取消
- imgUrl：只接受 URL
- UI：选择方案 A（把“比例”改为“分辨率 480P/720P/1080P”）
- type 推断：有首帧图=2(图生视频)，否则=1(文生视频)

## 改造目标
- 画布里的 VideoConfigNode 触发生成视频时，改为对接：
  - `POST /app-api/ai/video/generate`（返回视频记录 id）
  - `GET /app-api/ai/video/get-my?id=...` 轮询到 `status=30` 取 `videoUrl`
- 现有交互保持：自动创建 VideoNode，成功写入 url，失败/取消显示错误。

## 实施步骤（将要改的文件）
### 1) API 层：对齐 OpenAPI
- 修改 [video.js](file:///f:/code/lumeng/lumen-canvas/src/api/video.js)
  - `aiVideoGenerate(data)` → `authRequest.post('/ai/video/generate', data)`
  - `getMyVideo(id)` → `authRequest.get('/ai/video/get-my', { params:{ id } })`
  - 可选补齐（先做 API 方法，后续 UI 想用时直接接）：`my-page`、`public-page`、`my-list-by-ids`、`delete-my`

### 2) Hook：useVideoGeneration（提交 id + 轮询记录）
- 修改 [useVideoGeneration](file:///f:/code/lumeng/lumen-canvas/src/hooks/useApi.js#L242-L340)
  - 生成请求体适配 `AiVideoGenerateReqVO`：
    - `modelId`：从当前选择的 model key 映射到 id（优先直接从 videoModelOptions 找；兜底用 [getModelId](file:///f:/code/lumeng/lumen-canvas/src/stores/aiModels.js#L54-L61)）
    - `type`：按确认规则自动推断
    - `prompt`
    - `imgUrl`（type=2 必填）
    - `duration`（秒，int）
    - `resolution`（480P/720P/1080P）
  - 轮询：`getMyVideo(id)`
    - `status=30`：成功，返回 `{ url: data.videoUrl, id }`
    - `status=40/50`：失败/取消，抛错（优先用 `errorMessage`）
    - `status=10/20`：继续轮询

### 3) 节点 UI：VideoConfigNode 改成“分辨率”
- 修改 [VideoConfigNode.vue](file:///f:/code/lumeng/lumen-canvas/src/components/nodes/VideoConfigNode.vue)
  - 将“比例”下拉改为“分辨率”下拉（480P/720P/1080P），并把本地状态从 `localRatio` 改为 `localResolution`
  - 生成参数：
    - 图片只取 `sourceNode.data.url`，不再使用 base64
    - 若连接的 ImageNode 没有 url（只有 base64），直接提示“只支持 URL，请先上传/使用带 URL 的图片”并阻止提交
  - 保持现有“首帧/尾帧/参考图”的连线提示 UI；其中尾帧/参考图本期先不传给后端（接口未定义对应字段）

### 4) 默认数据与工作流兼容
- 修改 [canvas.js](file:///f:/code/lumeng/lumen-canvas/src/stores/canvas.js#L81-L129)
  - `videoConfig` 默认字段从 `ratio` 切换为 `resolution`（默认 720P），保持 `dur` 默认 5
- 工作流编排 [useWorkflowOrchestrator.js](file:///f:/code/lumeng/lumen-canvas/src/hooks/useWorkflowOrchestrator.js#L331-L424) 无需调整，autoExecute 流程仍可正常产出 VideoNode

## 验证方式（实现后执行）
- 本地启动后手动验证：
  - Text → VideoConfigNode（type=1）能生成并在 status=30 后显示 videoUrl
  - Image(url) + Text → VideoConfigNode（type=2）能生成
  - status=40/50 时 VideoNode 能显示错误信息
  - 模型下拉仍来自 `getAiModelList(type=4)`，请求体 `modelId` 正确

我将按以上方案开始改代码并完成本地验证。