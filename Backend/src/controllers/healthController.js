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

// Controlador para verificar la configuración del WebSocket
const websocketCheck = (req, res) => {
  try {
    // Usar la IP específica del servidor en lugar de detectarla automáticamente
    const ips = ['192.168.0.30']; // Usamos la IP específica configurada
    
    return res.status(200).json({
      status: 'ok',
      message: 'WebSocket server is configured',
      timestamp: new Date().toISOString(),
      serverInfo: {
        webSocketEnabled: true,
        port: process.env.PORT || 3000,
        serverIPs: ips,
        endpoints: {
          scanner: '/api/ws/scanner/{sessionId}',
          pos: '/api/ws/pos/{sessionId}'
        },
        fullUrls: ips.map(ip => `ws://${ip}:3000/api/ws/scanner/YOUR_SESSION_ID`),
        instructions: [
          "Asegúrate de usar el puerto 3000 en las URL de WebSocket del cliente",
          "Verifica que ambos dispositivos estén en la misma red WiFi",
          "Comprueba que no haya firewalls bloqueando la conexión",
          "El ID de sesión debe ser el mismo en el cliente POS y el escáner"
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'WebSocket check failed',
      error: error.message
    });
  }
};

module.exports = {
  healthCheck,
  websocketCheck
};