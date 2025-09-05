const express = require('express');
const router = express.Router();
const { healthCheck } = require('../controllers/healthController');

// Ruta para comprobar el estado del API
router.get('/', healthCheck);

// Ruta para verificar la configuración del WebSocket
router.get('/websocket', (req, res) => {
  res.json({
    status: 'success',
    message: 'Servidor WebSocket configurado correctamente',
    serverInfo: {
      webSocketEnabled: true,
      port: process.env.PORT || 3000,
      endpoints: {
        scanner: '/api/ws/scanner/{sessionId}',
        pos: '/api/ws/pos/{sessionId}'
      },
      instructions: {
        testConnection: 'Para probar la conexión WebSocket, abra el navegador y visite esta URL con el ID de sesión correcto',
        reconnect: 'Si tiene problemas de conexión, asegúrese de que está usando el puerto 3000 en el cliente'
      }
    }
  });
});

module.exports = router;