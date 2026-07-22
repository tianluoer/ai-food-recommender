/**
 * AI 外卖推荐 — 对话 API
 *
 * Vercel Serverless Function
 * 接收完整对话历史 → 调用 DeepSeek → 返回选择题或最终推荐
 */

const OpenAI = require('openai');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── System Prompt：选择题模式 ──
const SYSTEM_PROMPT = `你是一个幽默风趣的外卖推荐助手，名字叫"饭饭"🍔。

## 核心规则
- 每次回复只做一件事：问一个带选项的选择题
- 每道题提供 3~4 个选项，用户只需点击选择
- 选项之间互斥且有区分度，覆盖不同偏好方向
- 最后一个选项可以是"都可以"/"你推荐"让 AI 发挥

## 回复格式（严格遵循）
每次回复都按以下格式，不要加多余的话：

[问题的文字描述]
A. [选项A]
B. [选项B]
C. [选项C]
D. [选项D]（可选）

## 性格
- 语气轻松活泼，像朋友聊天
- 适当使用 emoji（每行1-2个）
- 问题控制在 40 字以内，选项控制在 8 字以内
- 用"你"称呼用户

## 问题策略（参考，灵活调整）
从以下维度逐步收窄用户偏好：
口味 → 菜系 → 肉类偏好 → 忌口 → 主食搭配 → 温度 → 预算 → 份量 → 饮品 → 场景确认

## 推荐规则
在收集了约10轮偏好后，不要再用选择题格式。直接在回复末尾附加以下 JSON：

\`\`\`
{"cuisine":"川菜","dish":"水煮牛肉面+酸梅汤","reason":"麻辣鲜香正好满足你对辣味的渴望","funFact":"吃辣能释放内啡肽让你开心！"}
\`\`\`

JSON 必须使用英文 key：cuisine(菜系), dish(具体菜品), reason(推荐理由), funFact(趣味评语)
不要在 JSON 外写大段文字，简短一两句即可。推荐必须具体到菜品。`;

// 第10轮时追加的提示
const FINAL_HINT = `\n\n⚠️ 你已经收集了足够多的偏好信息。现在不要再用选择题格式。直接给出推荐，并在回复末尾附上指定格式的 JSON（英文 key）。`;

// ── 导出 handler ──
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).set(CORS_HEADERS).json({ success: false, error: '仅支持 POST' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).set(CORS_HEADERS).json({ success: false, error: '请提供有效的 messages' });
    }

    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    const isFinalRound = userMsgCount >= 10;

    // 构建 System Prompt
    const systemContent = isFinalRound
      ? SYSTEM_PROMPT + FINAL_HINT
      : SYSTEM_PROMPT;

    // 调用 DeepSeek
    const aiText = await callDeepSeek(systemContent, messages);

    // ── 判断返回类型 ──
    const recommendation = parseRecommendation(aiText);

    if (isFinalRound || recommendation) {
      const rec = recommendation || fallbackRecommendation(aiText);
      return res.status(200).set(CORS_HEADERS).json({
        success: true,
        content: formatRecommendText(rec),
        round: userMsgCount,
        isComplete: true,
        recommendation: rec,
      });
    }

    // 选择题模式：解析问题和选项
    const { question, options } = parseMultipleChoice(aiText);

    return res.status(200).set(CORS_HEADERS).json({
      success: true,
      content: question,
      options: options.length >= 2 ? options : ['A. 好的 👍', 'B. 换一个 🤔', 'C. 你推荐 😋'],
      round: userMsgCount,
      isComplete: false,
    });
  } catch (error) {
    console.error('API Error:', error.message);
    if (error.status === 401 || error.message?.includes('401')) {
      return res.status(500).set(CORS_HEADERS).json({ success: false, error: 'AI 服务认证失败' });
    }
    if (error.status === 429 || error.message?.includes('429')) {
      return res.status(500).set(CORS_HEADERS).json({ success: false, error: 'AI 服务繁忙，请稍后重试' });
    }
    return res.status(500).set(CORS_HEADERS).json({ success: false, error: '服务器错误，请稍后重试' });
  }
};

// ── DeepSeek 调用 ──
async function callDeepSeek(systemContent, messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未设置');

  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey,
    timeout: 25000,
    maxRetries: 1,
  });

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemContent },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) })),
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek 返回空内容');
  return content;
}

// ── 解析选择题 ──
function parseMultipleChoice(text) {
  // 按行分割
  const lines = text.split('\n').filter((l) => l.trim());

  const options = [];
  const questionLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 匹配 A. B. C. D. 开头的选项行
    const match = trimmed.match(/^([A-D])[.、．)\s]\s*(.+)/);
    if (match) {
      options.push(`${match[1]}. ${match[2].trim()}`);
    } else {
      // 不包含 JSON 的非选项行 → 问题描述
      if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) {
        questionLines.push(trimmed);
      }
    }
  }

  return {
    question: questionLines.join('\n') || '来选一个吧~ 😋',
    options,
  };
}

// ── 解析推荐 JSON ──
function parseRecommendation(text) {
  try {
    const match = text.match(/\{[\s\S]*"cuisine"[\s\S]*"dish"[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);

    // 兼容英文 key（cuisine/dish/reason/funFact）
    // 也兼容中文 key（菜系/推荐菜品/推荐理由 等）
    const cuisine = parsed.cuisine || parsed['菜系'] || parsed['推荐菜系'] || '';
    const dish    = parsed.dish    || parsed['菜品'] || parsed['推荐菜品'] || parsed['具体菜品'] || '';
    const reason  = parsed.reason  || parsed['理由'] || parsed['推荐理由'] || '';
    const funFact = parsed.funFact || parsed['趣味'] || parsed['趣味评语'] || parsed['小贴士'] || '';

    if (cuisine || dish) {
      return {
        cuisine: String(cuisine).slice(0, 20) || '今日推荐',
        dish: String(dish).slice(0, 30) || '精选美食',
        reason: String(reason || '根据你的口味精心推荐').slice(0, 60),
        funFact: String(funFact || '希望你喜欢！🍽️').slice(0, 30),
      };
    }
  } catch {}
  return null;
}

function fallbackRecommendation(text) {
  return {
    cuisine: '今日精选',
    dish: '来点惊喜吧',
    reason: text.slice(0, 60),
    funFact: '希望你吃得开心！✨',
  };
}

function formatRecommendText(rec) {
  return [
    `🎉 根据你的口味，我推荐：`,
    ``,
    `🍽️ **${rec.cuisine} — ${rec.dish}**`,
    ``,
    `💡 ${rec.reason}`,
    ``,
    `✨ ${rec.funFact}`,
  ].join('\n');
}
