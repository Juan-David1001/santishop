// Controlador simple para health check
const healthCheck = (req, res) => {
  try {
    return res.status(200).json({
      status: 'ok',
      message: 'API is running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
};

module.exports = {
  healthCheck
};