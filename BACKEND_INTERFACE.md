# 后端接口文档 - 项目与画板模块

> 本文档描述了项目管理和画板数据的后端接口规范。
> 接口风格参考现有的登录认证接口。

## 1. 公共说明

- **基础路径 (Base URL)**: 参考项目配置 (如 `/api/v1` 或 `/member`)
- **鉴权方式**: HTTP Header `Authorization: Bearer <token>`
- **请求格式**: `Content-Type: application/json`
- **响应格式**:
  ```json
  {
    "code": 0,          // 0 表示成功，非 0 表示失败
    "msg": "success",   // 提示信息
    "data": { ... }     // 业务数据
  }
  ```

## 2. 项目管理接口

### 2.1 获取项目列表

*   **URL**: `/prompt/project/page`
*   **Method**: `GET`
*   **描述**: 获取当前用户的项目列表（简要信息，不包含庞大的画布数据）。

**请求参数 (Query)**:
| 参数名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| pageNo | Number | 否 | 页码 (默认1) |
| pageSize | Number | 否 | 每页数量 (默认20) |
| name | String | 否 | 搜索关键词 |

**响应示例**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "list": [
      {
        "id": "123456",
        "name": "我的创作项目",
        "thumbnail": "https://...",  // 缩略图 URL
        "createdAt": "2024-01-20T10:00:00.000Z",
        "updatedAt": "2024-01-21T10:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### 2.2 创建项目

*   **URL**: `/prompt/project/create`
*   **Method**: `POST`
*   **描述**: 创建一个新的空白项目。

**请求参数 (Body)**:
| 参数名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| name | String | 是 | 项目名称 |

**响应示例**:
```json
{
  "code": 0,
  "msg": "创建成功",
  "data": {
    "id": "123456",
    "name": "未命名项目",
    "thumbnail": "",
    "canvasData": { "nodes": [], "edges": [], "viewport": {} }, // 初始为空
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 2.3 获取项目详情（画板数据）

*   **URL**: `/prompt/project/get`
*   **Method**: `GET`
*   **描述**: 获取单个项目的完整数据，包括画布节点和连线。

**请求参数 (Query)**:
| 参数名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| id | String | 是 | 项目ID |

**响应示例**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "123456",
    "name": "我的创作项目",
    "thumbnail": "https://...",
    "canvasData": {
      "nodes": [ ... ],
      "edges": [ ... ],
      "viewport": { "x": 0, "y": 0, "zoom": 1 }
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 2.4 保存/更新项目

*   **URL**: `/prompt/project/update`
*   **Method**: `PUT`
*   **描述**: 保存项目数据，包括画布内容、缩略图和名称。

**请求参数 (Body)**:
| 参数名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| id | String | 是 | 项目ID |
| name | String | 否 | 项目名称 |
| thumbnail | String | 否 | 缩略图 (Base64 或 URL) |
| canvasData | Object | 否 | 画布数据 ({ nodes, edges, viewport }) |

**响应示例**:
```json
{
  "code": 0,
  "msg": "保存成功",
  "data": {
    "updatedAt": "2024-01-21T11:00:00.000Z"
  }
}
```

### 2.5 删除项目

*   **URL**: `/prompt/project/delete`
*   **Method**: `DELETE`
*   **描述**: 删除指定项目。

**请求参数 (Query)**:
| 参数名 | 类型 | 必填 | 描述 |
|---|---|---|---|
| id | String | 是 | 项目ID |

**响应示例**:
```json
{
  "code": 0,
  "msg": "删除成功",
  "data": null
}
```
