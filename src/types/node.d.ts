/**
 * Canvas node type definitions | 画布节点类型定义
 *
 * 与 stores/canvas.js 的 getDefaultNodeData() 的 switch 分支严格对应。
 * Strictly mirrors the switch branches in getDefaultNodeData().
 */

// Node type union | 节点类型联合
export type NodeType =
  | 'text'
  | 'image'
  | 'video'
  | 'imageConfig'
  | 'videoConfig'
  | 'textToImage'
  | 'textToVideo'
  | 'enhance'
  | 'group'

// Common fields shared by all node data | 所有节点 data 共享的公共字段
export interface BaseNodeData {
  label?: string
  createdAt?: number
  updatedAt?: number
  /** Output image url, set after generation | 生成后产出图片地址 */
  url?: string
  /** Output base64 fallback | 产出 base64 兜底 */
  base64?: string
  /** Thumbnail url (mainly for video nodes) | 缩略图地址（主要用于视频节点） */
  thumbnail?: string
  /** File name when sourced from upload | 来源于上传时的文件名 */
  fileName?: string | null
  /** Auto-execute flag (draft children forced false) | 自动执行标志 */
  autoExecute?: boolean
  /** Loading state | 加载状态 */
  loading?: boolean
  /** Error message | 错误信息 */
  error?: string | null
}

// Reference image carried by combination nodes | 组合节点携带的参考图
export interface ReferenceImage {
  url?: string
  base64?: string
  sourceNodeId?: string
  fileName?: string | null
  [key: string]: unknown
}

// text | 文本输入
export interface TextNodeData extends BaseNodeData {
  content: string
}

// image | 图片节点
export interface ImageNodeData extends BaseNodeData {
  url: string
}

// video | 视频节点
export interface VideoNodeData extends BaseNodeData {
  url: string
  duration?: number
}

// imageConfig | 文生图配置
export interface ImageConfigData extends BaseNodeData {
  prompt: string
  model: string
  size: string
  ratio: string
  quality: string
}

// videoConfig | 图生视频配置
export interface VideoConfigData extends BaseNodeData {
  prompt: string
  resolution: string
  dur: number
  model: string
}

// textToImage | 文生图(组合)
export interface TextToImageData extends BaseNodeData {
  content: string
  model: string
  n: number
  url: string
  /** Dynamically attached reference images | 运行时挂载的参考图数组 */
  referenceImages?: ReferenceImage[]
  referenceImageUrl?: string | null
  referenceImageFileName?: string | null
  referenceImageFileType?: string | null
}

// textToVideo | 文生视频(组合)
export interface TextToVideoData extends BaseNodeData {
  content: string
  model: string
  resolution: string
  dur: number
  /** Input mode: first/last frame vs reference images | 输入模式 */
  inputMode: 'frame' | 'reference'
  firstFrameUrl: string | null
  lastFrameUrl: string | null
  firstFrameSourceNodeId: string | null
  lastFrameSourceNodeId: string | null
  referenceImages: ReferenceImage[]
  // Backward compatibility | 向后兼容
  referenceImageUrl: string | null
  referenceImageFileName: string | null
  referenceImageFileType: string | null
  url: string
}

// enhance | 图片增强
export interface EnhanceNodeData extends BaseNodeData {
  sourceImageUrl: string
  sourceImageId: string
  enhanceType: 'upscale' | string
  upscaleModel: string
  upscaleStyle: string
  upscaleScale: number
  skinMode: string
  skinIntensity: number
  resultUrl: string
}

// group | 组合（含草稿态字段）
export interface GroupNodeData extends BaseNodeData {
  isDraft?: boolean
  draftId?: string
  draftIndex?: number
}

// type → data map | 类型到 data 的映射
export interface NodeDataMap {
  text: TextNodeData
  image: ImageNodeData
  video: VideoNodeData
  imageConfig: ImageConfigData
  videoConfig: VideoConfigData
  textToImage: TextToImageData
  textToVideo: TextToVideoData
  enhance: EnhanceNodeData
  group: GroupNodeData
}

// Any node data | 任意节点 data 联合
export type AnyNodeData = NodeDataMap[NodeType]

// Canvas node generic over type | 泛型画布节点
export interface CanvasNode<T extends NodeType = NodeType> {
  id: string
  type: T
  position: { x: number; y: number }
  parentNode?: string
  zIndex?: number
  style?: Record<string, string>
  data: NodeDataMap[T]
}

// Canvas edge | 画布连线
export interface CanvasEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  data?: Record<string, unknown>
}

// Viewport | 视口
export interface Viewport {
  x: number
  y: number
  zoom: number
}

// Persisted canvas data | 持久化的画布数据
export interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport?: Viewport
}
