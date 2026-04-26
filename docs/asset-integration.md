# 资产库后端联调说明

## 开发模式（mock，默认）

`.env.development.local`（gitignored）中：

```
VITE_USE_ASSET_MOCK=true
```

数据来自 `src/components/asset/_mock-data.js`，3 条预置 mock 资产（即梦带提示词、花瓣纯图、本地无标签）。

启动：

```bash
npm run dev
```

打开画布页 → 左侧工具栏的"资产库"按钮 → 抽屉滑入 → 拖资产到画布。

## 联调真实后端

1. 改为 `VITE_USE_ASSET_MOCK=false`（或删除该行）
2. 确保 `VITE_BASE_URL`（在 `.env*` 中）指向 lumen-backend 的 `/app-api`
3. **后端必须已部署 `AppAssetController`**（`/app-api/asset/import` 等）。
   当前后端只暴露 `/admin-api/asset/...`，正式联调前需要后端补一个 App-side controller，权限切换为登录用户校验（不用 `@PreAuthorize`，或换 `@PermitAll` + 内部 `getLoginUserId()`）。
4. 用户必须先登录（token 走 `authRequest` 的现有流程）

## 上传流程（与画布图片/视频节点一致）

后端不再代理文件字节。`importAsset` 走两步：

1. **`GET /infra/file/presigned-url?name={file.name}`** → `{ uploadUrl, url }`
2. **`PUT {uploadUrl}`**（前端直传 OSS，body 是 `File`，`Content-Type` 用文件 mime）
3. **`POST /app-api/asset/import`** body JSON：
   ```json
   {
     "source": "local|jimeng|huaban",
     "assetType": "image",
     "imageUrl": "<step1.url>",
     "sourceUrl": "<原页面URL，可选>",
     "prompt": "<可选>",
     "fileSize": 12345,
     "width": 512, "height": 512,
     "metadata": "<JSON 字符串，可选>"
   }
   ```
   返回 `{ id, imageUrl, videoUrl, duplicated }`。

Chrome 采集插件按相同顺序：先用前端拿到的 token 调 `/infra/file/presigned-url`、`PUT` 到 OSS，再调 `/asset/import`。

## 端到端验收场景（顶层 spec §7）

1. **A** 即梦图+提示词：插件采集 → canvas 抽屉刷新 → 拖入 → ImageNode + TextNode（无连边）
2. **B** 花瓣纯图：插件采集 → canvas 抽屉显示（prompt 空）→ 拖入 → 仅 ImageNode
3. **C** 本地上传：抽屉点上传 → list 头部出现 → 拖入 → ImageNode
4. **D** 去重：同一即梦图采集两次 → 第二次返回 `duplicated: true`，列表不重复
5. **E** Token 过期：插件 401 → 触发 OAuth 重新登录 → 回传新 token → 重试入库

## Mock 模式手测清单

启 `npm run dev` 之后逐项过：

| # | 操作 | 预期 |
|---|------|------|
| 1 | 点工具栏资产库按钮 | 右侧抽屉滑入，看到 3 条 mock 资产 |
| 2 | 在搜索框输入 "cat" | 列表过滤为含 "cat" 的资产（含即梦那条） |
| 3 | 来源筛选选 "花瓣" | 只显示 source=huaban 的那张 |
| 4 | 拖一张本地 PNG 到 uploader | 上传完成后列表头出现新条目 |
| 5 | 从花瓣卡片拖到画布 | 画布出现 ImageNode |
| 6 | 从即梦卡片拖到画布 | 同时出现 ImageNode 和 TextNode（无连边）|
| 7 | 点卡片右下角 × | 弹确认 → 列表移除 |
| 8 | 关抽屉 → F5 | 默认关闭；如果之前打开，刷新后保持打开 |

任何异常记录到 issue 单。

## 已知限制（MVP）

- 标签编辑 UI 未实现（只有后端 API），在卡片详情视图上后续再补
- 抽屉里没有图片详情面板（点击卡片当前是 no-op）
- 视频节点封面字段未实现，video 资产拖入直接用 url
