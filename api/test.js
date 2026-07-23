/**
 * 健康检查端点
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    success: true,
    hasApiKey: !!process.env.DEEPSEEK_API_KEY,
    nodeVersion: process.version,
    time: new Date().toISOString(),
  }));
};
