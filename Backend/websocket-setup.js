const WebSocket = require('ws');

// Función para configurar el servidor WebSocket en el servidor HTTP existente
function setupWebSocketServer(server) {
  // Crear un servidor WebSocket con verificación del origen
  const wss = new WebSocket.Server({ 
    server,
    // Permitir conexiones desde cualquier origen (importante para móviles)
    verifyClient: (info) => {
      const clientUrl = info.req.url;
      const clientOrigin = info.origin || 'unknown';
      console.log(`Intento de conexión WebSocket desde origen: ${clientOrigin}`);
      console.log(`URL solicitada: ${clientUrl}`);
      
      // Validamos que la URL sea una de las esperadas para nuestro WebSocket
      const validPathPattern = /^\/api\/ws\/(scanner|pos)\/[a-zA-Z0-9]+$/;
      const isValidPath = validPathPattern.test(clientUrl);
      
      if (!isValidPath) {
        console.log(`Rechazando conexión WebSocket: URL no válida - ${clientUrl}`);
        return false;
      }
      
      console.log(`Aceptando conexión WebSocket: ${clientUrl}`);
      return true; // Aceptar la conexión si pasa todas las validaciones
    }
  });

  // Almacenar conexiones activas
  const connections = {
    pos: {},      // Conexiones de POS indexadas por sessionId
    scanner: {},  // Conexiones de escáner indexadas por sessionId
  };

  // Imprimir todas las conexiones activas cada minuto (para depuración)
  const logInterval = setInterval(() => {
    const posCount = Object.keys(connections.pos).length;
    const scannerCount = Object.keys(connections.scanner).length;
    console.log(`Conexiones WebSocket activas: ${posCount} POS, ${scannerCount} Escáneres`);
    
    // Mostrar detalles de las sesiones activas
    if (posCount > 0 || scannerCount > 0) {
      console.log('Sesiones WebSocket activas:');
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
  
  // Configurar un intervalo para hacer ping a los clientes y detectar conexiones muertas
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        // La conexión no respondió al ping anterior, cerrarla
        console.log('Cerrando conexión WebSocket inactiva');
        return ws.terminate();
      }
      
      // Marcar como no viva hasta que responda con un pong
      ws.isAlive = false;
      
      // Enviar ping para verificar que la conexión sigue viva
      try {
        ws.ping();
        
        // También enviar un heartbeat en formato JSON
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          }));
        }
      } catch (err) {
        console.error(`Error al enviar ping/heartbeat: ${err.message}`);
        ws.terminate();
      }
    });
  }, 30000); // Verificar cada 30 segundos

  // Gestionar conexiones WebSocket
  wss.on('connection', (ws, req) => {
    // Configurar un ping/pong para mantener la conexión viva
    ws.isAlive = true;
    
    // Función ping para mantener la conexión activa
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Analizar la URL para obtener tipo y sessionId
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host}`);
    } catch (error) {
      console.error(`Error al analizar URL WebSocket: ${error.message}`);
      url = new URL(`http://${req.headers.host}${req.url}`);
    }
    const pathname = url.pathname;
    
    console.log(`Nueva conexión WebSocket: ${pathname}`);
    console.log(`- IP Cliente: ${req.socket.remoteAddress}`);
    console.log(`- Headers: ${JSON.stringify(req.headers)}`);
    
    // Determinar el tipo de conexión y el ID de sesión
    let type = null;
    let sessionId = null;
    
    // Patrón: /api/ws/pos/{sessionId} - Nuevo prefijo para evitar conflictos con rutas API
    const posMatch = pathname.match(/\/api\/ws\/pos\/([a-zA-Z0-9]+)/);
    if (posMatch) {
      type = 'pos';
      sessionId = posMatch[1];
    }
    
    // Patrón: /api/ws/scanner/{sessionId}
    const scannerMatch = pathname.match(/\/api\/ws\/scanner\/([a-zA-Z0-9]+)/);
    if (scannerMatch) {
      type = 'scanner';
      sessionId = scannerMatch[1];
    }
    
    // Verificar si se pudo identificar el tipo de conexión y el ID de sesión
    if (!type || !sessionId) {
      console.error(`Conexión WebSocket rechazada: tipo o sessionId no válido - ${pathname}`);
      console.error(`- URL completa: ${req.url}`);
      console.error(`- Origin: ${req.headers.origin || 'desconocido'}`);
      console.error(`- Host: ${req.headers.host || 'desconocido'}`);
      console.error(`- User-Agent: ${req.headers['user-agent'] || 'desconocido'}`);
      ws.close(1008, 'Invalid connection type or sessionId');
      return;
    }
    
    // Comprobar si ya existe una conexión del mismo tipo con este sessionId
    const existingConnection = type === 'pos' ? connections.pos[sessionId] : connections.scanner[sessionId];
    
    if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
      console.log(`Ya existe una conexión ${type} abierta para la sesión ${sessionId}. Cerrando la antigua.`);
      try {
        // Cerrar la conexión anterior antes de registrar la nueva
        existingConnection.close(1000, 'Nueva conexión establecida para la misma sesión');
      } catch (err) {
        console.error(`Error al cerrar conexión existente: ${err.message}`);
      }
    }
    
    // Registrar la conexión
    console.log(`Registrando conexión WebSocket ${type} con sessionId: ${sessionId}`);
    
    // Registrar la conexión en el objeto correspondiente
    if (type === 'pos') {
      connections.pos[sessionId] = ws;
    } else if (type === 'scanner') {
      connections.scanner[sessionId] = ws;
    }
    
    // Agregar un pequeño retraso antes de enviar confirmaciones para evitar problemas de carrera
    setTimeout(() => {
      try {
        // Solo enviar si la conexión sigue abierta
        if (ws.readyState === WebSocket.OPEN) {
          // Informar sobre la conexión exitosa
          ws.send(JSON.stringify({
            type: 'connection',
            status: 'connected',
            sessionId: sessionId,
            timestamp: new Date().toISOString()
          }));
          
          // Verificar si hay una conexión complementaria
          if (type === 'pos' && connections.scanner[sessionId] && 
              connections.scanner[sessionId].readyState === WebSocket.OPEN) {
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
          } else if (type === 'scanner' && connections.pos[sessionId] && 
                    connections.pos[sessionId].readyState === WebSocket.OPEN) {
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
        }
      } catch (err) {
        console.error(`Error al enviar mensajes de confirmación: ${err.message}`);
      }
    }, 500); // 500ms de retraso para garantizar estabilidad
    
    // Manejar mensajes recibidos
    ws.on('message', (message) => {
      // Resetear el indicador de "isAlive" cada vez que recibimos un mensaje
      ws.isAlive = true;
      
      // Verificar el tipo de mensaje (texto o binario)
      const isBuffer = Buffer.isBuffer(message);
      const isBinary = message instanceof ArrayBuffer || isBuffer;
      
      // Para depuración
      if (isBinary) {
        console.log(`Mensaje binario recibido de ${type} (${sessionId}), tamaño: ${
          isBuffer ? message.length : message.byteLength
        } bytes`);
      }
      
      // Convertir mensaje según formato
      let messageText;
      try {
        if (isBinary) {
          // Convertir mensaje binario a texto
          messageText = isBuffer ? message.toString('utf8') : Buffer.from(message).toString('utf8');
        } else if (typeof message === 'string') {
          // Ya es texto
          messageText = message;
        } else {
          // Otro formato, intentar toString
          messageText = message.toString();
        }
        
        // Parsear el JSON
        const data = JSON.parse(messageText);
        
        // Procesar mensajes según su tipo
        switch (data.type) {
          case 'barcode':
            if (type === 'scanner' && connections.pos[sessionId]) {
              console.log(`Reenviando código de barras a POS (${sessionId}): ${data.code}`);
              
              try {
                // Si el POS está conectado, reenviar el mensaje
                if (connections.pos[sessionId].readyState === WebSocket.OPEN) {
                  // Usar el mismo formato (texto o binario)
                  connections.pos[sessionId].send(messageText, { binary: false });
                  
                  // Enviar confirmación de recepción al escáner
                  ws.send(JSON.stringify({
                    type: 'barcode_received',
                    code: data.code,
                    timestamp: new Date().toISOString()
                  }));
                } else {
                  console.log(`POS no está listo para recibir mensajes (estado: ${connections.pos[sessionId].readyState})`);
                  
                  // Notificar al escáner que el POS no está disponible
                  ws.send(JSON.stringify({
                    type: 'error',
                    message: 'POS no disponible para recibir códigos',
                    timestamp: new Date().toISOString()
                  }));
                }
              } catch (err) {
                console.error(`Error al reenviar código de barras: ${err.message}`);
                
                // Notificar error al escáner
                try {
                  ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Error al enviar código al POS',
                    details: err.message,
                    timestamp: new Date().toISOString()
                  }));
                } catch (sendErr) {
                  console.error(`Error al enviar notificación de error: ${sendErr.message}`);
                }
              }
            } else if (type === 'scanner' && !connections.pos[sessionId]) {
              console.log(`POS no conectado para sessionId: ${sessionId}`);
              
              // Notificar al escáner que no hay POS conectado
              try {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'No hay un POS conectado para recibir el código',
                  timestamp: new Date().toISOString()
                }));
              } catch (err) {
                console.error(`Error al enviar notificación de error: ${err.message}`);
              }
            }
            break;
            
          case 'command':
            if (type === 'pos' && connections.scanner[sessionId]) {
              console.log(`Reenviando comando a escáner (${sessionId}): ${data.command}`);
              
              try {
                connections.scanner[sessionId].send(messageText, { binary: false });
              } catch (err) {
                console.error(`Error al reenviar comando: ${err.message}`);
              }
            }
            break;
            
          case 'ping':
          case 'heartbeat_response':
            // Responder con un pong para el sistema de heartbeat
            try {
              ws.send(JSON.stringify({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
              }));
            } catch (err) {
              console.error(`Error al enviar heartbeat: ${err.message}`);
            }
            break;
            
          case 'connection_confirmed':
            console.log(`Conexión confirmada por cliente ${type} (${sessionId})`);
            if (data.deviceInfo) {
              console.log(`- Información del dispositivo: ${JSON.stringify(data.deviceInfo)}`);
            }
            break;
            
          case 'barcode_sent_confirmation':
            // El escáner confirma que envió un código, no es necesario hacer nada más
            console.log(`Confirmación de código enviado recibida de ${type} (${sessionId})`);
            break;
            
          default:
            // Registrar mensajes desconocidos pero no hacer nada con ellos
            console.log(`Mensaje de tipo desconocido recibido de ${type} (${sessionId}): ${
              JSON.stringify(data).substring(0, 200)
            }${JSON.stringify(data).length > 200 ? '...' : ''}`);
        }
      } catch (error) {
        console.error(`Error al procesar mensaje WebSocket: ${error.message}`);
        
        if (isBinary) {
          console.error(`Mensaje binario problemático (primeros 100 bytes): ${
            isBuffer ? message.slice(0, 100).toString('hex') : Buffer.from(message).slice(0, 100).toString('hex')
          }`);
        } else {
          console.error(`Mensaje original (truncado): ${
            (typeof message === 'string' ? message : message.toString()).substring(0, 200)
          }`);
        }
        
        // Intentar notificar al cliente del error
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Error al procesar mensaje',
            details: error.message,
            timestamp: new Date().toISOString()
          }));
        } catch (err) {
          console.error(`Error al enviar notificación de error: ${err.message}`);
        }
      }
    });
    
    // Manejar cierre de conexión
    ws.on('close', (code, reason) => {
      console.log(`Conexión WebSocket cerrada para ${type} (${sessionId}) - Código: ${code}, Razón: ${reason || 'No especificada'}`);
      
      // Guardar métricas de la duración de la conexión
      const connectionDuration = Date.now() - ws._connectionStartTime;
      console.log(`Duración de la conexión: ${connectionDuration/1000} segundos`);
      
      // Eliminar la conexión
      if (type === 'pos') {
        delete connections.pos[sessionId];
        
        // Notificar al escáner si existe
        if (connections.scanner[sessionId]) {
          try {
            connections.scanner[sessionId].send(JSON.stringify({
              type: 'pos_status',
              status: 'disconnected',
              code: code,
              reason: reason || 'Desconexión sin razón específica',
              timestamp: new Date().toISOString()
            }));
          } catch (err) {
            console.error(`Error al notificar desconexión a escáner: ${err.message}`);
          }
        }
      } else if (type === 'scanner') {
        delete connections.scanner[sessionId];
        
        // Notificar al POS si existe
        if (connections.pos[sessionId]) {
          try {
            connections.pos[sessionId].send(JSON.stringify({
              type: 'scanner_status',
              status: 'disconnected',
              code: code,
              reason: reason || 'Desconexión sin razón específica',
              timestamp: new Date().toISOString()
            }));
          } catch (err) {
            console.error(`Error al notificar desconexión a POS: ${err.message}`);
          }
        }
      }
    });
    
    // Manejar errores
    ws.on('error', (error) => {
      console.error(`Error en conexión WebSocket ${type} (${sessionId}): ${error.message}`);
      console.error('Detalles del error:', error);
      
      // Intentar enviar mensaje de error al cliente si es posible
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error en la conexión WebSocket',
          details: error.message,
          timestamp: new Date().toISOString()
        }));
      } catch (sendError) {
        console.error('No se pudo enviar mensaje de error al cliente:', sendError.message);
      }
    });
    
    // Registrar tiempo de inicio de la conexión para métricas
    ws._connectionStartTime = Date.now();
  });

  // Manejar cierre del servidor
  server.on('close', () => {
    // Limpiar todos los intervalos
    clearInterval(pingInterval);
    clearInterval(logInterval);
    
    // Cerrar todas las conexiones WebSocket con mensaje explícito
    wss.clients.forEach(client => {
      try {
        client.send(JSON.stringify({
          type: 'server_shutdown',
          message: 'El servidor se está cerrando de manera controlada',
          timestamp: new Date().toISOString()
        }));
        client.close(1000, 'Servidor cerrándose de manera controlada');
      } catch (err) {
        console.error('Error al cerrar conexión WebSocket:', err.message);
      }
    });
    
    console.log('Servidor WebSocket cerrado correctamente');
  });

  console.log('Servidor WebSocket configurado correctamente');
  
  // Mostrar la IP específica del servidor en los logs
  try {
    const port = server.address().port;
    const serverIP = '192.168.0.30'; // IP específica del servidor
    
    console.log('URLs de acceso WebSocket disponibles:');
    console.log(`- ws://localhost:${port}/api/ws/`);
    console.log(`- ws://${serverIP}:${port}/api/ws/`);
    
    // Mostrar URL completas de ejemplo para facilitar las pruebas
    console.log('\nEjemplos de URL completas:');
    console.log(`- ws://${serverIP}:${port}/api/ws/scanner/SESION_ID`);
    console.log(`- ws://${serverIP}:${port}/api/ws/pos/SESION_ID`);
  } catch (err) {
    console.error('No se pudieron determinar las IPs locales:', err.message);
  }

  return wss;
}

module.exports = setupWebSocketServer;