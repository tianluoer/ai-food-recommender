/**
 * 极简测试端点
 */
module.exports = async (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify({
    success: true,
    hasApiKey: !!process.env.DEEPSEEK_API_KEY,
    time: new Date().toISOString(),
  }));
};
