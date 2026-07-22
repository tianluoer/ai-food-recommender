# API 接口设计

> 最后更新：2026-07-22
> 版本：v1.0

---

## 概述

本项目的后端仅有一个 API 端点，作为 DeepSeek API 的安全代理。

---

## 端点

### `POST /api/chat`

对话接口。接收用户的消息历史，AI 返回下一个问题或最终推荐。

#### Request

```http
POST /api/chat HTTP/1.1
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "我想吃辣的" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `messages` | Array | ✅ | 对话历史，每项含 `role` 和 `content` |
| `messages[].role` | String | ✅ | `"user"` |
| `messages[].content` | String | ✅ | 用户输入内容，最长 500 字符 |

> 注：前端只需传用户的回答。System Prompt 和历史管理在后端处理。

#### Response（成功 — 对话进行中）

```json
{
  "success": true,
  "content": "好的！那你是喜欢川菜的麻辣🌶️，还是湘菜的香辣？",
  "round": 3,
  "isComplete": false
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | Boolean | 始终 `true` |
| `content` | String | AI 的回复（下一个问题） |
| `round` | Number | 当前轮次（1-10） |
| `isComplete` | Boolean | `false`（对话未结束） |

#### Response（成功 — 推荐完成）

```json
{
  "success": true,
  "content": "根据你的口味，我强烈推荐...",
  "round": 10,
  "isComplete": true,
  "recommendation": {
    "cuisine": "川菜",
    "dish": "麻辣香锅",
    "reason": "你喜欢麻辣重口味，今天气温偏低，一份热辣的麻辣香锅正好暖身",
    "funFact": "据说爱吃辣的人运气都不会太差！🌶️✨"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `recommendation` | Object | 仅 `isComplete=true` 时出现 |
| `recommendation.cuisine` | String | 推荐菜系 |
| `recommendation.dish` | String | 具体菜品 |
| `recommendation.reason` | String | 推荐理由 |
| `recommendation.funFact` | String | 趣味评语 |

#### Response（错误）

```json
{
  "success": false,
  "error": "AI 服务暂时不可用，请稍后再试"
}
```

#### HTTP 状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 400 | 请求格式错误（如 messages 为空） |
| 500 | 服务器内部错误（AI API 调用失败） |
| 504 | AI API 超时 |

---

## 后端内部流程

```
POST /api/chat
        │
        ▼
  ┌─────────────────┐
  │ 1. 校验请求      │ → 400 if 无效
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │ 2. 拼接 System   │
  │    Prompt        │
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │ 3. 调用 DeepSeek  │ → 500/504 if 失败
  │    API           │
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │ 4. 解析响应       │
  │    判断轮次       │
  └──────┬──────────┘
         │
         ▼
  ┌─────────────────┐
  │ 5. 返回给前端     │
  └─────────────────┘
```

---

## DeepSeek 调用配置

```javascript
const openai = require('openai');

const client = new openai.OpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages,
  ],
  temperature: 0.8,
  max_tokens: 500,
});
```

---

## 安全措施

| 措施 | 实现 |
|------|------|
| API Key 隔离 | 仅在 Vercel 环境变量中，代码不硬编码 |
| 请求大小限制 | Body 最大 50KB |
| 内容长度限制 | 单条消息最大 500 字符 |
| CORS | 允许所有来源（公开服务） |
| 输入过滤 | 移除控制字符，转义 HTML 实体 |
