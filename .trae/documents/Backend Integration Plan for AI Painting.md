收到，使用批量查询接口进行轮询。

**调整后的实施步骤：**

1.  **API 定义 (`src/api/image.js`)**：
    *   `getAiModelList`: `GET /app-api/ai/model/simple-list`
    *   `aiImageDraw`: `POST /app-api/ai/image/draw`
    *   `getAiImageListByIds`: `GET /app-api/ai/image/my-list-by-ids` (接收 `ids` 数组)

2.  **创建模型 Store (`src/stores/aiModels.js`)**：
    *   获取并缓存模型列表，提供 `Key -> ID` 的映射。

3.  **重构生图逻辑 (`src/hooks/useApi.js`)**：
    *   **批量提交**：由于后端 `/draw` 接口似乎未显式提供 `n` (数量) 参数，前端将根据 `n` 的值并发调用多次 `/draw` 接口，获取多个任务 ID。
    *   **批量轮询**：
        *   使用 `getAiImageListByIds` 同时查询所有任务 ID 的状态。
        *   **判断完成**：当返回列表中所有记录的状态都为“成功”或“失败”时，结束轮询。
        *   **结果聚合**：收集所有生成的 `picUrl` 返回。

**确认：**
是否按照此批量轮询方案执行？