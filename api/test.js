/**
 * 测试端点 — 验证 Vercel Function 是否正常工作
 */
module.exports = async function handler(req, res) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  return res.status(200).set(CORS_HEADERS).json({
    success: true,
    message: 'Vercel Function works!',
    hasApiKey: !!process.env.DEEPSEEK_API_KEY,
    nodeVersion: process.version,
  });
};
