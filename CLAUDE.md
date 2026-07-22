# CLAUDE.md — AI 外卖推荐助手

> 项目指引文件，供 Claude Code 在每个会话中自动加载。

---

## 项目简介

这是一个 AI 驱动的外卖推荐网站。用户通过与 AI 进行 10 轮问答，获得个性化的外卖推荐。网站部署在 Vercel 免费平台，使用 DeepSeek API。

## 关键约束

1. **用户是不懂代码的小白** — 所有操作尽量简单，说明要通俗
2. **零依赖前端** — 单文件 HTML，不引入框架
3. **后端极简** — 单一 Serverless Function，无数据库
4. **安全** — API Key 决不能出现在前端代码中
5. **稳定推进** — 每个 Phase 完成并验证后，再进入下一 Phase

---

## 标准文件路径

| 文档 | 路径 | 说明 |
|------|------|------|
| 开发需求 | [docs/requirements.md](docs/requirements.md) | 功能与非功能需求定义 |
| 技术规范 | [docs/tech-spec.md](docs/tech-spec.md) | 技术栈、代码规范、安全规则 |
| 设计规范 | [docs/design-spec.md](docs/design-spec.md) | 配色、布局、动画、语气 |
| 执行计划 | [docs/execution-plan.md](docs/execution-plan.md) | 分 5 个 Phase 的详细步骤 |
| API 设计 | [docs/api-design.md](docs/api-design.md) | 接口定义、请求/响应格式 |
| 开发日志 | [dev-logs/](dev-logs/) | 按日期记录每日开发进度 |

---

## 工作流程

### 每次会话开始
1. 检查 `docs/execution-plan.md`，确认当前 Phase 进度
2. 在 `dev-logs/` 创建当天的日志文件（如 `2026-07-23.md`）
3. 根据执行计划推进，不要跳步

### 开发过程
1. 严格遵循 `docs/tech-spec.md` 中的技术规范
2. UI 部分严格遵循 `docs/design-spec.md` 中的设计规范
3. API 部分严格遵循 `docs/api-design.md` 中的接口定义
4. 每个 Phase 完成后更新 `docs/execution-plan.md` 中的进度表

### 每次会话结束
1. 更新当天开发日志，记录：
   - 已完成事项
   - 遇到的问题及解决方案
   - 下一步计划
   - 当前 Phase 进度
2. 如果有未完成事项，标记为明日计划

---

## 技术要点速查

```
前端:  index.html（内嵌 CSS + JS，单文件）
后端:  api/chat.js（Vercel Serverless Function）
AI:    DeepSeek API (baseURL: https://api.deepseek.com/v1, model: deepseek-chat)
部署: Vercel Hobby（需设环境变量 DEEPSEEK_API_KEY）
依赖: 仅 openai npm 包
```

## 常用命令

```bash
# 本地开发
vercel dev

# 部署
vercel --prod
```
