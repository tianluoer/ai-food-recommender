/**
 * AI 外卖推荐 — Cloudflare Pages Function
 * 路径: /api/chat
 * 接收对话历史 → 调用 DeepSeek API → 返回选择题或推荐
 */

// ── System Prompt ──
const SYSTEM_PROMPT = `你是一个幽默风趣的外卖推荐助手，名字叫"饭饭"🍔。你帮用户决定今天点哪家外卖。

## 🛵 重要：你在帮人点外卖
- 推荐的都是外卖平台（美团/饿了么）上能点到的真实菜品
- 预算按外卖实际价格来：10~60元是常态
- 菜品要具体到能在外卖 App 搜到的名字，如"水煮牛肉""黄焖鸡米饭"
- 不推荐堂食大菜、高级餐厅菜品

## ⚠️ 核心规则（必须严格遵守）
- 每轮问一个选择题，给出 4~5 个具体选项
- 选项必须和问题严格对应：问预算→价格范围，问菜系→菜系名，问菜品→具体菜名
- 选项多变有区分度，让用户有真正的选择感
- 如果用户说"换一批"，生成完全不同方向的新选项
- 绝对不能只问问题不给选项！

## 回复格式（必须原样遵守）
[问题的文字描述]
A. [具体选项A]
B. [具体选项B]
C. [具体选项C]
D. [具体选项D]
E. [不需要/跳过]（每道题最后一个选项必须是"不需要"或"跳过"这类拒绝选项）

- 问题40字以内，每个选项10字以内
- 语气轻松活泼，适当使用 emoji
- 用"你"称呼用户

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
    let { question, options } = parseMultipleChoice(aiText);

    // 如果解析不到足够选项，追加 API 调用专门生成选项
    if (options.length < 2) {
      try {
        const fixedOptions = await fixOptions(env, question);
        if (fixedOptions.length >= 2) {
          options = fixedOptions;
        }
      } catch {}
    }

    // 最终兜底：基于话题智能生成
    if (options.length < 2) {
      options = generateSmartFallback(question);
    }

    return json(200, {
      success: true,
      content: question,
      options,
      round: userMsgCount,
      isComplete: false,
    });
  } catch (error) {
    console.error('API Error:', error.message);
    return json(500, { success: false, error: '服务器错误，请稍后重试' });
  }
}

// ── JSON 响应辅助（禁用缓存） ──
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
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
    // 匹配 A-E 或 1-5 或 a-e 开头的选项行
    const match = trimmed.match(/^([A-Ea-e1-5])[.、．)\s]+(.+)/);
    if (match) {
      options.push(`${match[1].toUpperCase()}. ${match[2].trim()}`);
    } else if (trimmed.match(/^[①②③④⑤]\s*(.+)/)) {
      options.push(trimmed);
    } else {
      if (!trimmed.startsWith('{') && !trimmed.startsWith('\`\`\`')) {
        questionLines.push(trimmed);
      }
    }
  }

  // 如果没有解析到选项，尝试按换行直接生成
  if (options.length === 0) {
    const nonEmpty = lines.filter(l => l.trim().length > 2 && !l.trim().startsWith('{'));
    if (nonEmpty.length >= 3) {
      const labels = ['A', 'B', 'C', 'D', 'E'];
      nonEmpty.slice(0, 5).forEach((l, i) => {
        options.push(`${labels[i]}. ${l.trim().slice(0, 20)}`);
      });
    }
  }

  return {
    question: questionLines.join('\n') || '来选一个吧~ 😋',
    options,
  };
}

// ── 二次调用修复选项 ──
async function fixOptions(env, question) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) return [];

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{
        role: 'system',
        content: '你是外卖选项生成器。为外卖选择题生成具体选项，必须与食物相关。绝不输出"好的""换一个""你决定"这类兜底文字。',
      }, {
        role: 'user',
        content: `为这道外卖选择题生成4-5个具体选项（外卖平台能点到的真实菜品/主食/口味）：\n\n"${question}"\n\n严格按以下格式输出，每行一个：\nA. 具体选项\nB. 具体选项\n...\n每个选项不超过10字。`,
      }],
      temperature: 0.5,
      max_tokens: 150,
    }),
  });

  if (!resp.ok) return [];
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || '';
  const { options } = parseMultipleChoice(text);
  return options;
}

// ── 智能兜底（不再出现"好的/换一个"） ──
function generateSmartFallback(question) {
  // 从问题中提取关键词来判断话题
  const q = question.toLowerCase();
  const topicMap = [
    { keys: ['口味', '甜', '辣', '酸', '咸', '清淡'], opts: ['辣的过瘾 🌶️', '清淡养生 🥬', '酸甜开胃 🍋', '咸香浓郁 🧂'] },
    { keys: ['菜系', '中餐', '西餐', '日料', '韩料'], opts: ['川菜麻辣 🌶️', '粤菜鲜美 🥢', '日料精致 🍣', '你推荐 😋'] },
    { keys: ['肉', '荤', '牛肉', '猪肉', '鸡肉', '海鲜', '鱼'], opts: ['牛肉 🥩', '猪肉 🐷', '鸡肉 🐔', '海鲜 🦐'] },
    { keys: ['主食', '米', '面', '馒头', '饭'], opts: ['米饭 🍚', '面条 🍜', '馒头 🥟', '都可以 😋'] },
    { keys: ['菜', '蔬菜', '素', '配'], opts: ['炒青菜 🥬', '凉拌黄瓜 🥒', '酸辣土豆丝 🥔', '不用搭配 👍'] },
    { keys: ['汤', '粥'], opts: ['番茄蛋汤 🍅', '紫菜汤 🥣', '酸辣汤 🌶️', '不用汤 👍'] },
    { keys: ['饮', '喝', '茶', '可乐', '水'], opts: ['可乐 🥤', '酸梅汤 🍹', '柠檬水 🍋', '白开水 💧'] },
    { keys: ['辣度', '辣', '麻'], opts: ['微辣 🌶️', '中辣 🌶️🌶️', '特辣 🔥🔥🔥', '不辣 ❌'] },
    { keys: ['温度', '热', '凉', '冷'], opts: ['热乎的 🔥', '常温的 👍', '冰凉的 🧊', '都可以 😋'] },
    { keys: ['预算', '钱', '价格', '贵', '便宜', '多少'], opts: ['15元以内 💰', '15-25元 💰💰', '25-40元 💰💰💰', '40-60元 🍽️', '不设限 😎'] },
    { keys: ['份量', '量', '大', '小', '吃'], opts: ['小份尝鲜 🧆', '中份刚好 🍽️', '大份过瘾 🍕', '都可以 👍'] },
    { keys: ['时间', '餐', '午', '晚', '夜宵'], opts: ['午餐 ☀️', '晚餐 🌙', '夜宵 🦉', '下午茶 🍰'] },
  ];

  for (const { keys, opts } of topicMap) {
    if (keys.some(k => q.includes(k))) {
      return ['A', 'B', 'C', 'D', 'E'].slice(0, opts.length).map((l, i) => `${l}. ${opts[i]}`);
    }
  }

  return ['A. 👍 就这个', 'B. 🔄 换一批', 'C. 🎲 你拍板', 'D. 👉 下一题', 'E. 🍜 随机推荐'];
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
