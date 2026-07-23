/**
 * AI 外卖推荐 — Cloudflare Pages Function
 * 路径: /api/chat
 * 接收对话历史 → 调用 DeepSeek API → 返回选择题或推荐
 */

// ── System Prompt ──
const SYSTEM_PROMPT = `你是一个幽默风趣的外卖推荐助手，名字叫"饭饭"🍔。

## 核心规则
- 每次回复只做一件事：问一个带选项的选择题
- 每道题提供 3~4 个选项，用户只需点击选择
- 选项之间互斥且有区分度
- 最后一个选项可以是"都可以"/"你推荐"

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
口味 → 菜系 → 肉类偏好 → 忌口 → 主食搭配 → 温度 → 预算 → 份量 → 饮品 → 场景确认

## 推荐规则
在收集了约10轮偏好后，不要再用选择题格式。
直接在回复末尾附加 JSON（必须英文 key）：

{"cuisine":"川菜","dish":"水煮牛肉面+酸梅汤","reason":"麻辣鲜香正好满足你对辣味的渴望","funFact":"吃辣能释放内啡肽让你开心！"}

推荐必须具体到菜品。`;

const FINAL_HINT = `\n\n⚠️ 你已经收集了足够多的偏好信息。现在不要再用选择题格式。直接给出推荐，并在回复末尾附上指定格式的 JSON（英文 key：cuisine, dish, reason, funFact）。`;

// ── CORS 头 ──
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── 入口 ──
export async function onRequest({ request, env }) {
  // OPTIONS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS });
  }

  if (request.method !== 'POST') {
    return json(405, { success: false, error: '仅支持 POST' });
  }

  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json(400, { success: false, error: '请提供有效的 messages' });
    }

    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    const isFinalRound = userMsgCount >= 10;

    const systemContent = isFinalRound
      ? SYSTEM_PROMPT + FINAL_HINT
      : SYSTEM_PROMPT;

    const aiText = await callDeepSeek(env, systemContent, messages);

    // ── 判断返回类型 ──
    const recommendation = parseRecommendation(aiText);

    if (isFinalRound || recommendation) {
      const rec = recommendation || fallbackRecommendation(aiText);
      return json(200, {
        success: true,
        content: formatRecommendText(rec),
        round: userMsgCount,
        isComplete: true,
        recommendation: rec,
      });
    }

    // 选择题模式
    const { question, options } = parseMultipleChoice(aiText);

    return json(200, {
      success: true,
      content: question,
      options: options.length >= 2 ? options : ['A. 好的 👍', 'B. 换一个 🤔', 'C. 你推荐 😋'],
      round: userMsgCount,
      isComplete: false,
    });
  } catch (error) {
    console.error('API Error:', error.message);
    return json(500, { success: false, error: '服务器错误，请稍后重试' });
  }
}

// ── JSON 响应辅助 ──
function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// ── 调用 DeepSeek API ──
async function callDeepSeek(env, systemContent, messages) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未设置');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemContent },
        ...messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 500) })),
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API 返回 ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── 解析选择题 ──
function parseMultipleChoice(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const options = [];
  const questionLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([A-D])[.、．)\s]\s*(.+)/);
    if (match) {
      options.push(`${match[1]}. ${match[2].trim()}`);
    } else {
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

    const cuisine = parsed.cuisine || parsed['菜系'] || parsed['推荐菜系'] || '';
    const dish    = parsed.dish    || parsed['菜品'] || parsed['推荐菜品'] || '';
    const reason  = parsed.reason  || parsed['理由'] || parsed['推荐理由'] || '';
    const funFact = parsed.funFact || parsed['趣味'] || parsed['趣味评语'] || '';

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
