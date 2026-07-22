# 技术规范

> 最后更新：2026-07-22
> 版本：v1.0

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | HTML5 + CSS3 + Vanilla JS | 零依赖，无框架 |
| 后端 | Vercel Serverless Function (Node.js 20.x) | 单文件 API 代理 |
| AI | DeepSeek API (`deepseek-chat`) | 兼容 OpenAI SDK |
| 部署 | Vercel Hobby 计划 | 免费额度 |
| 版本管理 | GitHub | 公开仓库 |

## 项目结构

```
ai_food/
├── index.html               # 主页面（HTML + CSS + JS 全部内嵌）
├── api/
│   └── chat.js              # Vercel Serverless Function
├── package.json              # 仅含 openai SDK 依赖
├── vercel.json               # Vercel 路由配置
├── docs/                     # 项目文档
├── dev-logs/                 # 开发日志
└── .claude/                  # Claude Code 配置
```

## 前端规范

### 文件组织
- 单文件 `index.html`，内嵌 `<style>` 和 `<script>`
- 不引入任何外部 CSS/JS 框架
- 所有资源使用内联或系统字体

### 浏览器兼容
- 最低支持：Chrome 90+、Safari 14+、Edge 90+、Firefox 90+
- 使用标准 ES2020 语法（支持 async/await、fetch、可选链）
- 不使用需要编译的语法

### 响应式断点
| 断点 | 宽度 | 目标设备 |
|------|------|----------|
| 手机 | 320px - 767px | 移动端 |
| 平板 | 768px - 1023px | iPad |
| 桌面 | 1024px+ | 电脑 |

### 状态管理
- 使用简单的全局状态对象（不引入状态管理库）
- 状态结构：
```js
const state = {
  messages: [],       // 对话历史 [{role, content}]
  currentRound: 0,    // 当前轮次 0-10
  isLoading: false,   // 是否等待 AI 回复
  isDone: false       // 是否已完成推荐
}
```

## 后端规范

### API 端点
```
POST /api/chat
```

### 请求格式
```json
{
  "messages": [
    { "role": "user", "content": "我想吃辣的" },
    ...
  ]
}
```

### 响应格式
```json
{
  "content": "AI 的问题或推荐内容",
  "round": 2,
  "isComplete": false
}
```

### 环境变量
| 变量名 | 说明 | 位置 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | Vercel 环境变量 |

### 错误处理
- API 超时：30 秒
- 错误时返回 `{ error: "错误描述" }` + HTTP 5xx
- 前端捕获后显示友好提示

## AI 配置

### Model 参数
```js
{
  model: "deepseek-chat",
  temperature: 0.8,         // 稍高温度增加回答趣味性
  max_tokens: 500,          // 单个回复最大长度
  stream: false             // 不使用流式（简化实现）
}
```

### System Prompt 结构
```
你是一个幽默风趣的外卖推荐助手，名字叫"饭饭"。
你的任务是通过10个问题了解用户的口味偏好，
然后给出精准的外卖推荐。
[详细规则...]

规则：
1. 每次只问一个问题
2. 问题要基于前序回答逐步深入
3. 语气轻松活泼，多用emoji
4. 第10轮后给出最终推荐，用JSON格式
```

---

## 安全规则

- API Key 仅存在于 Vercel 环境变量，不写入代码
- 前端请求不做身份验证（公开服务）
- 输入内容转义，防止 XSS
- 后端限制请求体大小（最大 50KB）
