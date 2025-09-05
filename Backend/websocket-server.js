const WebSocket = require('ws');
const http = require('http');

// Crear un servidor HTTP
const server = http.createServer((req, res) => {
  // Para manejar solicitudes HTTP básicas (para pruebas)
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Servidor WebSocket en funcionamiento');
});

// Crear un servidor WebSocket con verificación del origen
const wss = new WebSocket.Server({ 
  server,
  // Permitir conexiones desde cualquier origen (importante para móviles)
  verifyClient: (info) => {
    console.log(`Intento de conexión desde: ${info.origin} - ${info.req.url}`);
    return true; // Aceptar todas las conexiones
  }
});

// Almacenar conexiones activas
const connections = {
  pos: {},      // Conexiones de POS indexadas por sessionId
  scanner: {},  // Conexiones de escáner indexadas por sessionId
};

// Imprimir todas las conexiones activas cada minuto (para depuración)
setInterval(() => {
  const posCount = Object.keys(connections.pos).length;
  const scannerCount = Object.keys(connections.scanner).length;
  console.log(`Conexiones activas: ${posCount} POS, ${scannerCount} Escáneres`);
  
  // Mostrar detalles de las sesiones activas
  if (posCount > 0 || scannerCount > 0) {
    console.log('Sesiones activas:');
    Object.keys(connections.pos).forEach(id => {
      console.log(`- POS: ${id} ${connections.scanner[id] ? '(con escáner conectado)' : '(sin escáner)'}`);
    });
    Object.keys(connections.scanner).forEach(id => {
      if (!connections.pos[id]) {
        console.log(`- Escáner: ${id} (sin POS conectado)`);
      }
    });
  }
}, 60000);

// Gestionar conexiones WebSocket
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  
  console.log(`Nueva conexión WebSocket: ${pathname}`);
  
  // Determinar el tipo de conexión y el ID de sesión
  let type = null;
  let sessionId = null;
  
  // Patrón: /pos/{sessionId}
  const posMatch = pathname.match(/\/pos\/([a-zA-Z0-9]+)/);
  if (posMatch) {
    type = 'pos';
    sessionId = posMatch[1];
  }
  
  // Patrón: /scanner/{sessionId}
  const scannerMatch = pathname.match(/\/scanner\/([a-zA-Z0-9]+)/);
  if (scannerMatch) {
    type = 'scanner';
    sessionId = scannerMatch[1];
  }
  
  // Verificar si se pudo identificar el tipo de conexión y el ID de sesión
  if (!type || !sessionId) {
    console.error(`Conexión rechazada: tipo o sessionId no válido - ${pathname}`);
    ws.close(1008, 'Invalid connection type or sessionId');
    return;
  }
  
  // Registrar la conexión
  console.log(`Registrando conexión ${type} con sessionId: ${sessionId}`);
  
  if (type === 'pos') {
    connections.pos[sessionId] = ws;
  } else if (type === 'scanner') {
    connections.scanner[sessionId] = ws;
  }
  
  // Informar sobre la conexión exitosa
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  }));
  
  // Verificar si hay una conexión complementaria
  if (type === 'pos' && connections.scanner[sessionId]) {
    // Informar al POS que hay un escáner conectado
    ws.send(JSON.stringify({
      type: 'scanner_status',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
    
    // Informar al escáner que hay un POS conectado
    connections.scanner[sessionId].send(JSON.stringify({
      type: 'pos_status',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  } else if (type === 'scanner' && connections.pos[sessionId]) {
    // Informar al escáner que hay un POS conectado
    ws.send(JSON.stringify({
      type: 'pos_status',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
    
    // Informar al POS que hay un escáner conectado
    connections.pos[sessionId].send(JSON.stringify({
      type: 'scanner_status',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  }
  
  // Manejar mensajes recibidos
  ws.on('message', (message) => {
    console.log(`Mensaje recibido de ${type} (${sessionId}): ${message}`);
    
    try {
      const data = JSON.parse(message);
      
      // Reenviar códigos de barras del escáner al POS
      if (type === 'scanner' && data.type === 'barcode' && connections.pos[sessionId]) {
        console.log(`Reenviando código de barras a POS (${sessionId}): ${data.code}`);
        connections.pos[sessionId].send(message);
      }
      
      // Reenviar mensajes del POS al escáner
      if (type === 'pos' && data.type === 'command' && connections.scanner[sessionId]) {
        console.log(`Reenviando comando a escáner (${sessionId}): ${data.command}`);
        connections.scanner[sessionId].send(message);
      }
    } catch (error) {
      console.error(`Error al procesar mensaje: ${error.message}`);
    }
  });
  
  // Manejar cierre de conexión
  ws.on('close', () => {
    console.log(`Conexión cerrada para ${type} (${sessionId})`);
    
    // Eliminar la conexión
    if (type === 'pos') {
      delete connections.pos[sessionId];
      
      // Notificar al escáner si existe
      if (connections.scanner[sessionId]) {
        connections.scanner[sessionId].send(JSON.stringify({
          type: 'pos_status',
          status: 'disconnected',
          timestamp: new Date().toISOString()
        }));
      }
    } else if (type === 'scanner') {
      delete connections.scanner[sessionId];
      
      // Notificar al POS si existe
      if (connections.pos[sessionId]) {
        connections.pos[sessionId].send(JSON.stringify({
          type: 'scanner_status',
          status: 'disconnected',
          timestamp: new Date().toISOString()
        }));
      }
    }
  });
  
  // Manejar errores
  ws.on('error', (error) => {
    console.error(`Error en conexión ${type} (${sessionId}): ${error.message}`);
  });
});

// Iniciar el servidor en todas las interfaces de red
const PORT = process.env.WEBSOCKET_PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor WebSocket escuchando en puerto ${PORT} (todas las interfaces)`);
  console.log(`URL local: ws://localhost:${PORT}`);
  
  // Intentar obtener IP local para mostrarla en los logs
  try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    console.log('URLs de acceso disponibles:');
    Object.keys(nets).forEach((name) => {
      nets[name].forEach((net) => {
        // Solo mostramos IPv4 y no direcciones internas
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`- ws://${net.address}:${PORT}`);
        }
      });
    });
  } catch (err) {
    console.error('No se pudieron determinar las IPs locales:', err.message);
  }
});

// Para manejar el cierre del servidor correctamente
process.on('SIGINT', () => {
  console.log('Cerrando servidor WebSocket...');
  wss.clients.forEach(client => {
    client.close(1000, 'Servidor cerrándose');
  });
  server.close(() => {
    console.log('Servidor WebSocket cerrado');
    process.exit(0);
  });
});

module.exports = server; // Exportar para poder usarlo desde otros archivos