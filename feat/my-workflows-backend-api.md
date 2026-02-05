# Flow（我的工作流）后端存储：表结构与主要接口

接口统一前缀：`/prompt/flow`

## 表结构（建议）

### 表：`prompt_flow`

| 字段 | 类型（MySQL 示例） | 必填 | 说明 |
|---|---|---:|---|
| id | bigint PK AI | 是 | 主键 |
| user_id | bigint | 是 | 所属用户 |
| name | varchar(64) | 是 | 工作流名称 |
| tags_json | json / text | 否 | 标签数组 JSON（最多 5） |
| remark | varchar(512) / text | 否 | 备注 |
| cover | varchar(512) / text | 否 | 封面（建议 URL；也可临时存 dataURL） |
| nodes_json | longtext | 是 | 节点数组 JSON（ExportedNode[]） |
| edges_json | longtext | 是 | 连线数组 JSON（ExportedEdge[]） |
| is_deleted | tinyint(1) | 是 | 软删标记（0/1） |
| created_at | bigint | 是 | 创建时间（ms 时间戳） |
| updated_at | bigint | 是 | 更新时间（ms 时间戳） |

索引建议：
- `idx_user_updated (user_id, is_deleted, updated_at desc)`
- `idx_user_name (user_id, is_deleted, name)`（可选：keyword 查询）

#### Graph JSON 结构（用于校验）

ExportedNode：
- `type: string`
- `position: { x:number, y:number }`
- `data: object`（可 JSON 序列化）

ExportedEdge：
- `sourceIndex: number`
- `targetIndex: number`
- `sourceHandle?: string`
- `targetHandle?: string`
- `type?: string`
- `data?: object`

## 主要接口（MVP）

所有接口默认只操作当前登录用户数据。

### 1) 创建

**POST** `/prompt/flow/create`

Body：
```json
{
  "name": "工作流名称",
  "tags": ["tag1"],
  "remark": "备注",
  "cover": "https://.../cover.png",
  "nodes": [],
  "edges": []
}
```

Response data：
```json
{ "id": 1, "createdAt": 1730000000000, "updatedAt": 1730000000000 }
```

### 2) 更新（全量）

**POST** `/prompt/flow/update`

Body：
```json
{
  "id": 1,
  "name": "工作流名称",
  "tags": ["tag1"],
  "remark": "备注",
  "cover": "https://.../cover.png",
  "nodes": [],
  "edges": []
}
```

Response data：
```json
{ "id": 1, "updatedAt": 1730000001000 }
```

### 3) 详情（含图数据）

**GET** `/prompt/flow/get?id=1`

Response data：
```json
{
  "id": 1,
  "name": "工作流名称",
  "tags": ["tag1"],
  "remark": "备注",
  "cover": "https://.../cover.png",
  "nodes": [],
  "edges": [],
  "createdAt": 1730000000000,
  "updatedAt": 1730000001000
}
```

### 4) 分页列表（默认不返回图数据）

**GET** `/prompt/flow/page?pageNo=1&pageSize=20&keyword=xx&tag=tag1&withGraph=0`

Query：
- `pageNo` 默认 1
- `pageSize` 默认 20
- `keyword` 可选：匹配 name/remark
- `tag` 可选：按标签过滤
- `withGraph` 可选：`0`（默认）不返回 nodes/edges；`1` 返回 nodes/edges

Response data：
```json
{
  "pageNo": 1,
  "pageSize": 20,
  "total": 100,
  "list": [
    {
      "id": 1,
      "name": "工作流名称",
      "tags": ["tag1"],
      "remark": "备注",
      "cover": "https://.../cover.png",
      "createdAt": 1730000000000,
      "updatedAt": 1730000001000
    }
  ]
}
```

### 5) 删除

**DELETE** `/prompt/flow/delete?id=1`

Response data：
```json
true
```
