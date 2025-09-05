import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FaCamera, FaQrcode, FaArrowLeft, FaExclamationTriangle, FaKeyboard } from 'react-icons/fa';

function BarcodeScanner() {
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [browserInfo, setBrowserInfo] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const location = useLocation();

  // Obtener ID de sesión de la URL o generar uno nuevo
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session');
    
    if (sessionId) {
      console.log(`ID de sesión encontrado: ${sessionId}`);
      setSessionId(sessionId);
      
      // Establecer conexión WebSocket
      initWebSocket(sessionId);
      
      // Registrar visibilidad de la página para manejar cambios
      // (por ejemplo, cuando el usuario cambia de pestaña y vuelve)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('Página visible nuevamente, verificando conexión WebSocket');
          
          // Si el WebSocket está cerrado o cerrando, reintentar conexión
          if (socketInstance && 
             (socketInstance.readyState === WebSocket.CLOSED || 
              socketInstance.readyState === WebSocket.CLOSING)) {
            console.log('Reconectando WebSocket después de volver a la página');
            initWebSocket(sessionId);
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Limpiar el event listener al desmontar
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Si no hay ID de sesión, muestra un mensaje explicativo
      setError('No se proporcionó un ID de sesión. Debes acceder a esta página escaneando el código QR desde el POS.');
    }
  }, [location]);

  // Inicializar conexión WebSocket
  const initWebSocket = (id, reconnectAttempt = 0) => {
    setConnecting(true);
    
    // No limpiar mensajes de error si estamos reconectando
    if (reconnectAttempt === 0) {
      setError('');
    }

    // Si ya hay una conexión abierta, cerrarla primero
    if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
      console.log('Cerrando conexión WebSocket existente antes de crear una nueva');
      socketInstance._isManualClose = true;
      socketInstance.close();
    }

    try {
      // Determinar URL del WebSocket con más opciones para garantizar la conexión
      // 1. Usamos la IP fija del servidor backend en lugar del hostname actual
      // 2. Esto garantiza que la conexión sea a la dirección correcta independientemente del origen
      const host = '192.168.0.30'; // Usamos la IP específica del servidor
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Forzar el puerto 3000 para la conexión WebSocket, ya que es donde se ejecuta el backend
      // independientemente del puerto del frontend (5173 en desarrollo, 80/443 en producción)
      const port = '3000';
      
      // Indicamos que estamos en un entorno específico con IP fija
      const isLocalDevelopment = false; // No es localhost, es una IP específica
      
      // Construir la URL base para el WebSocket - Ahora usando /api/ws/ y el puerto del backend (3000)
      const wsUrl = `${wsProtocol}//${host}:${port}/api/ws/scanner/${id}`;
      
      console.log(`Intentando conectar a WebSocket: ${wsUrl}`);
      
      // Mostrar información de conexión para ayudar en depuración
      console.log('Información de conexión:');
      console.log(`- Protocolo: ${wsProtocol}`);
      console.log(`- Host: ${host}`);
      console.log(`- Puerto: ${port} (forzado al puerto del backend)`);
      console.log(`- ID de sesión: ${id}`);
      console.log(`- URL completa: ${wsUrl}`);
      
      // Crear la conexión WebSocket
      const ws = new WebSocket(wsUrl);
      
      // Definir un timeout para detectar problemas de conexión
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('Timeout de conexión WebSocket');
          setError(`No se pudo establecer la conexión con el servidor en 192.168.0.30:3000. Asegúrate de que el servidor backend esté ejecutándose en el puerto 3000 y que ambos dispositivos estén en la misma red WiFi.`);
          
          // Mostrar instrucciones más detalladas de solución de problemas
          console.error('=============================================');
          console.error('DIAGNÓSTICO DE PROBLEMAS DE CONEXIÓN WEBSOCKET:');
          console.error('1. Verifica que el servidor backend esté ejecutándose en el puerto 3000');
          console.error('2. Asegúrate de que ambos dispositivos estén en la misma red WiFi');
          console.error('3. Comprueba que no haya firewalls bloqueando la conexión');
          console.error('4. Intenta abrir manualmente la siguiente URL en el navegador para verificar si el backend responde:');
          console.error('   http://192.168.0.30:3000/api/health-check');
          console.error('5. Si estás usando una red móvil, asegúrate de que permite conexiones WebSocket');
          console.error('6. Revisa los logs del servidor backend para ver si hay errores');
          console.error('=============================================');
          
          ws.close();
        }
      }, 15000); // 15 segundos de timeout (aumentado para dar más tiempo en redes lentas)
      
      ws.onopen = () => {
        setConnecting(false);
        setConnected(true);
        setSocketInstance(ws);
        setSuccess('Conectado al POS');
        console.log('WebSocket conectado correctamente');
        clearTimeout(connectionTimeout);
        
        // Enviar mensaje de "ping" periódicamente para mantener la conexión viva
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
          }
        }, 30000); // Cada 30 segundos
        
        // Guardar el intervalo para limpiarlo después
        ws._pingInterval = pingInterval;
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Mensaje recibido:', data);
          
          // Marcar como conectado cuando recibimos cualquier mensaje del servidor
          if (!connected) {
            setConnected(true);
          }
          
          // Responder a los heartbeats para mantener viva la conexión
          if (data.type === 'heartbeat') {
            // Enviar respuesta de heartbeat para confirmar que el cliente está activo
            ws.send(JSON.stringify({
              type: 'heartbeat_response',
              timestamp: new Date().toISOString()
            }));
            // No hacemos nada más con los heartbeats
            return;
          }
          
          // Control de duplicados para evitar spam de mensajes
          const messageKey = `${data.type}_${data.status}_${data.sessionId}`;
          const now = Date.now();
          
          // Si ya mostramos este mensaje en los últimos 5 segundos, no mostrarlo de nuevo
          if (ws._lastMessages && ws._lastMessages[messageKey] && now - ws._lastMessages[messageKey] < 5000) {
            console.log('Mensaje duplicado ignorado:', messageKey);
            return;
          }
          
          // Guardar timestamp del mensaje
          if (!ws._lastMessages) ws._lastMessages = {};
          ws._lastMessages[messageKey] = now;
          
          if (data.type === 'pos_status') {
            if (data.status === 'connected') {
              setSuccess('POS conectado y listo para escanear');
            } else if (data.status === 'disconnected') {
              // Solo mostrar este error si no estamos en proceso de reconexión
              if (!ws._isReconnecting) {
                setError('El POS se ha desconectado. Espera reconexión o recarga la página.');
              }
            }
          } else if (data.type === 'server_shutdown') {
            setError(`El servidor se está cerrando: ${data.message || 'Mantenimiento programado'}`);
          } else if (data.type === 'connection' && data.status === 'connected') {
            setSuccess('Conexión establecida correctamente');
            
            // Limpiar cualquier bandera de reconexión
            ws._isReconnecting = false;
            ws._reconnectAttempt = 0;
            
            // Enviar mensaje de confirmación de conexión
            ws.send(JSON.stringify({
              type: 'connection_confirmed',
              sessionId: data.sessionId,
              deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                type: 'scanner'
              },
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error al procesar mensaje:', error);
        }
      };
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        if (ws._pingInterval) clearInterval(ws._pingInterval);
        
        setConnected(false);
        setConnecting(false);
        console.log(`WebSocket cerrado: ${event.code} - ${event.reason}`);
        
        // Analizar los diferentes códigos de cierre para ofrecer información más precisa
        // 1000: Cierre normal
        // 1001: Cierre por navegación a otra página
        // 1005: Sin status code (causado a menudo por problemas de red)
        // 1006: Conexión cerrada de forma anormal (problemas de red/servidor)
        // 1008: Violación de política (mensaje no válido)
        // 1011: Error interno en el servidor
        
        let reconnectDelay = 0;
        let shouldReconnect = false;
        
        // Verificar si ya excedimos el número máximo de intentos de reconexión
        const maxReconnectAttempts = 5;
        const reconnectAttempt = ws._reconnectAttempt || 0;
        
        if (reconnectAttempt >= maxReconnectAttempts) {
          setError(`Demasiados intentos de reconexión (${reconnectAttempt}). Por favor, recarga la página.`);
          return;
        }
        
        switch (event.code) {
          case 1000:
          case 1001:
            // Cierre normal
            setError('Desconectado del servidor.');
            shouldReconnect = false;
            break;
          case 1005:
            // Desactivar mensajes de error para código 1005 para evitar spam
            // Solo mostrar mensaje después del tercer intento
            if (reconnectAttempt >= 2) {
              setError('Conexión inestable. Intentando restablecer...');
            }
            reconnectDelay = 5000; // Mayor retraso para evitar ciclos rápidos
            shouldReconnect = reconnectAttempt < maxReconnectAttempts;
            break;
          case 1006:
            setError('Conexión perdida de forma anormal. Verificando red...');
            reconnectDelay = 4000;
            shouldReconnect = reconnectAttempt < maxReconnectAttempts;
            break;
          case 1008:
            setError(`Desconectado: ${event.reason || 'ID de sesión no válido'}`);
            shouldReconnect = false;
            break;
          case 1011:
            setError('Error en el servidor. Intentando reconectar...');
            reconnectDelay = 6000;
            shouldReconnect = reconnectAttempt < maxReconnectAttempts;
            break;
          default:
            // Solo mostrar mensajes de error cada dos intentos para reducir spam
            if (reconnectAttempt % 2 === 0) {
              setError(`Conexión perdida (código ${event.code}). Intentando reconectar...`);
            }
            reconnectDelay = 4000;
            shouldReconnect = reconnectAttempt < maxReconnectAttempts;
        }
        
        // Implementar reconexión con backoff exponencial y limitación de intentos
        if (shouldReconnect && !ws._isManualClose) {
          // Guardar el contador de intentos de reconexión
          ws._reconnectAttempt = reconnectAttempt + 1;
          
          // Aplicar backoff exponencial pero con un límite máximo
          const maxDelay = 30000; // 30 segundos máximo
          const baseDelay = reconnectDelay;
          const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, ws._reconnectAttempt - 1), maxDelay);
          
          console.log(`Intentando reconexión automática en ${exponentialDelay/1000} segundos (intento ${ws._reconnectAttempt}/${maxReconnectAttempts})...`);
          
          // Guardar el timeout para poder cancelarlo si es necesario
          const reconnectTimeout = setTimeout(() => {
            if (!socketInstance || socketInstance.readyState !== WebSocket.OPEN) {
              console.log('Intentando reconexión automática...');
              // Pasar el contador de intentos para mantener la cuenta
              ws._isReconnecting = true; // Marcar que estamos en proceso de reconexión
              initWebSocket(id);
            }
          }, exponentialDelay);
          
          ws._reconnectTimeout = reconnectTimeout;
        } else if (!shouldReconnect && reconnectAttempt >= maxReconnectAttempts) {
          // Mostrar botón para reintentar manualmente
          setError('Se alcanzó el límite de intentos de reconexión. Por favor, recarga la página o haz clic en "Reconectar".');
        }
      };
      
      ws.onerror = (error) => {
        setConnecting(false);
        setConnected(false);
        console.error('Error en WebSocket:', error);
        
        // Mostrar mensaje de error más detallado
        if (isLocalDevelopment) {
          setError(
            'Error de conexión WebSocket. Verifica que el servidor esté ejecutándose en ' + 
            `${host}:${port} y que no haya bloqueadores de conexión (firewall, etc).`
          );
        } else {
          setError(
            'Error al conectar con el POS. Asegúrate de que estás en la misma red ' +
            'y que el servidor WebSocket está activo.'
          );
        }
      };
      
      setSocketInstance(ws);
      
      // Limpiar el WebSocket cuando el componente se desmonte
      return () => {
        clearTimeout(connectionTimeout);
        if (ws._pingInterval) clearInterval(ws._pingInterval);
        if (ws && ws.readyState !== WebSocket.CLOSED) {
          ws.close(1000, 'Componente desmontado');
        }
      };
    } catch (error) {
      setConnecting(false);
      setError(`Error al inicializar la conexión: ${error.message}`);
      console.error('Error de conexión:', error);
    }
  };

  // Iniciar el escaneo con la cámara
  const startScanner = async () => {
    setError('');
    
    if (!connected) {
      setError('No hay conexión con el POS');
      return;
    }
    
    // Verificar explícitamente que la referencia al video existe antes de comenzar
    if (!videoRef.current) {
      console.error('No se puede iniciar el escáner: referencia de video no disponible');
      
      // Intentar obtener la referencia por ID como alternativa
      const videoElement = document.getElementById('scanner-video-element');
      if (videoElement) {
        console.log('Elemento de video encontrado por ID, asignando a la referencia');
        videoRef.current = videoElement;
      } else {
        setError('Error interno: No se puede acceder al elemento de video. Intenta recargar la página.');
        return;
      }
    }
    
    // Verificación robusta del soporte de MediaDevices API
    // Chrome a veces tiene el objeto navigator.mediaDevices pero sin getUserMedia
    // O puede tener mediaDevices inaccesible por políticas de seguridad
    const hasMediaDevicesAPI = () => {
      try {
        return !!(navigator && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
      } catch (e) {
        console.error('Error al verificar API MediaDevices:', e);
        return false;
      }
    };
    
    // Si no hay API MediaDevices, intentar con una solución alternativa para IPs sin HTTPS
    if (!hasMediaDevicesAPI()) {
      console.log('MediaDevices API no disponible normalmente, intentando forzar su uso');
      
      // Intento de solución alternativa para IP sin HTTPS
      try {
        // Forzar acceso a getUserMedia como solución para IPs sin HTTPS
        navigator.getUserMedia = navigator.getUserMedia || 
                               navigator.webkitGetUserMedia || 
                               navigator.mozGetUserMedia || 
                               navigator.msGetUserMedia;
                               
        if (navigator.getUserMedia) {
          console.log('API antigua getUserMedia disponible, intentando usar esta');
          // Continuamos con el flujo, usaremos la API antigua más adelante
        } else {
          throw new Error('No se pudo encontrar ninguna API de cámara disponible');
        }
      } catch (legacyError) {
        setError(
          'Tu navegador no permite acceso a la cámara en conexiones IP sin HTTPS. ' +
          'Posibles soluciones: \n' +
          '1. Activa la opción "Sitios inseguros" en chrome://flags/#unsafely-treat-insecure-origin-as-secure y agrega tu IP\n' +
          '2. Usa la entrada manual de códigos como alternativa'
        );
        console.error('MediaDevices API no disponible ni siquiera con métodos alternativos:', legacyError);
        return;
      }
    }
    
    try {
      // Mostrar mensaje de espera
      setSuccess('Solicitando acceso a la cámara...');
      
      // Configuración con múltiples opciones para aumentar compatibilidad
      let constraints = {
        audio: false,
        video: { 
          facingMode: { ideal: 'environment' },  // Preferir cámara trasera pero aceptar frontal
          width: { ideal: 1280, min: 640 },     // Resolución flexible
          height: { ideal: 720, min: 480 }
        }
      };
      
      // Solicitar acceso a la cámara con múltiples métodos para mayor compatibilidad
      console.log('Solicitando acceso a la cámara con constraints:', constraints);
      let stream;
      
      // Intentar diferentes métodos para obtener acceso a la cámara
      try {
        // Método 1: API moderna MediaDevices (preferida)
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Acceso a cámara obtenido con API MediaDevices moderna');
          } catch (modernApiError) {
            console.log('Error con API moderna, intentando opciones más básicas:', modernApiError);
            
            // Si falla, intentar con configuración más básica
            constraints = { audio: false, video: true };
            try {
              stream = await navigator.mediaDevices.getUserMedia(constraints);
              console.log('Acceso a cámara obtenido con API MediaDevices usando configuración básica');
            } catch (basicConstraintError) {
              throw basicConstraintError; // Propagar error para intentar otros métodos
            }
          }
        } else {
          throw new Error('API MediaDevices no disponible, intentando métodos alternativos');
        }
      } catch (modernError) {
        // Método 2: API antigua como fallback para conexiones IP sin HTTPS
        console.log('Intentando acceso a la cámara con API antigua para conexiones IP:', modernError);
        
        if (navigator.getUserMedia) {
          // Usar promesa para mantener consistencia con la API moderna
          try {
            stream = await new Promise((resolve, reject) => {
              navigator.getUserMedia(
                { audio: false, video: true },
                resolveStream => resolve(resolveStream),
                rejectError => reject(new Error('Error en API antigua: ' + rejectError.message))
              );
            });
            console.log('Acceso a cámara obtenido con API antigua de getUserMedia');
          } catch (legacyError) {
            console.error('Error con API antigua getUserMedia:', legacyError);
            throw legacyError;
          }
        } else {
          throw new Error('Ningún método para acceder a la cámara está disponible en este navegador');
        }
      }
      console.log('Acceso a la cámara concedido:', stream);
      
      // Verificar explícitamente que la referencia al video exista y sea un elemento válido
      if (!videoRef.current) {
        console.error('La referencia al video no está disponible - videoRef.current es null o undefined');
        setError('Error interno: El elemento de video no está disponible. Intenta recargar la página.');
        
        // Limpiar el stream ya que no podemos asignarlo
        if (stream) {
          try {
            stream.getTracks().forEach(track => track.stop());
          } catch (cleanError) {
            console.error('Error al limpiar stream sin referencia de video:', cleanError);
          }
        }
        return;
      }
      
      console.log('Referencia de video disponible, inicializando con stream');
      
      try {
        // Verificar que videoRef.current sea realmente un elemento de video
        if (!(videoRef.current instanceof HTMLVideoElement)) {
          throw new Error('videoRef.current no es un elemento de video válido');
        }
        
        // Limpiar cualquier instancia anterior
        if (videoRef.current.srcObject) {
          const oldStream = videoRef.current.srcObject;
          oldStream.getTracks().forEach(track => track.stop());
        }
        
        // Asignar el stream al elemento de video
        videoRef.current.srcObject = stream;
        
        // Configurar atributos importantes para Chrome
        videoRef.current.autoplay = true;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        
        // Agregar evento para el caso en que el video se detenga inesperadamente
        videoRef.current.onpause = () => {
          console.log('Video pausado inesperadamente, intentando reanudar');
          if (scanning && videoRef.current) {
            videoRef.current.play().catch(e => console.warn('No se pudo reanudar video:', e));
          }
        };
        
        // Esperar a que el video esté listo para reproducirse con un timeout de seguridad
        const metadataTimeout = setTimeout(() => {
          console.warn('Timeout esperando metadata de video, intentando reproducir de todas formas');
          if (videoRef.current && scanning) {
            videoRef.current.play().catch(e => {
              console.error('Error al reproducir video después de timeout:', e);
              setError('Error al iniciar reproducción de video: ' + e.message);
            });
          }
        }, 3000); // 3 segundos de timeout
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata cargada');
          clearTimeout(metadataTimeout);
          
          if (videoRef.current) {
            videoRef.current.play().catch(e => {
              console.error('Error al reproducir video:', e);
              setError('Error al iniciar reproducción de video: ' + e.message);
              
              // Intento adicional específico para Chrome
              setTimeout(() => {
                if (videoRef.current && scanning) {
                  console.log('Intento adicional para reproducir video...');
                  videoRef.current.play().catch(retryError => 
                    console.error('Error en segundo intento de reproducción:', retryError)
                  );
                }
              }, 1000);
            });
          }
        };
        
        // Manejar error de carga de video
        videoRef.current.onerror = (e) => {
          console.error('Error en elemento video:', e);
          setError('Error en elemento de video: ' + (e.message || 'Error desconocido'));
        };
        
        setScanning(true);
        setSuccess('Cámara iniciada. Apunta al código de barras.');
        
        // Verificar si BarcodeDetector está realmente disponible (no solo la propiedad)
        const hasBarcodeAPI = 'BarcodeDetector' in window && typeof window.BarcodeDetector === 'function';
        
        if (hasBarcodeAPI) {
          console.log('Usando BarcodeDetector API nativa');
          detectWithBarcodeAPI(stream);
        } else {
          console.log('BarcodeDetector no disponible, usando detección por frames');
          // Si no, recurrimos a la detección manual de frames
          detectWithFrames(stream);
        }
      } catch (initError) {
        console.error('Error al inicializar el video:', initError);
        setError('Error al configurar el elemento de video: ' + initError.message);
        
        // Limpiar el stream en caso de error
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      setScanning(false);
      
      // Mensajes de error más descriptivos según el tipo de error
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permiso denegado: Por favor permite el acceso a la cámara para escanear códigos. En Chrome con conexión IP, necesitas habilitar chrome://flags/#unsafely-treat-insecure-origin-as-secure');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        setError('La cámara está siendo utilizada por otra aplicación o no está disponible.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Las restricciones solicitadas para la cámara no se pueden cumplir en este dispositivo. Intenta de nuevo con otra configuración.');
      } else if (err.name === 'SecurityError') {
        setError('Error de seguridad: Chrome no permite acceso a la cámara en conexiones IP sin HTTPS. Ve a chrome://flags/#unsafely-treat-insecure-origin-as-secure, agrega http://192.168.0.30:5173 y reinicia Chrome.');
      } else if (err.name === 'TypeError' && err.message.includes('getUserMedia')) {
        setError('Error de acceso a cámara: API bloqueada para conexiones IP sin HTTPS. Ve a chrome://flags/#unsafely-treat-insecure-origin-as-secure, agrega tu IP y reinicia Chrome.');
        console.error('TypeError con getUserMedia - Problema común en Chrome con conexiones IP:', err);
      } else {
        setError('Error al acceder a la cámara: ' + err.message + '. Para IPs en Chrome, configura chrome://flags/#unsafely-treat-insecure-origin-as-secure');
      }
      
      console.error('Error detallado de cámara:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        constraints: err.constraint,
        browser: navigator.userAgent
      });
      
      // Mostrar instrucciones específicas para Chrome si se detecta
      const isChrome = /chrome/i.test(navigator.userAgent) && !/edge|edg/i.test(navigator.userAgent);
      if (isChrome) {
        console.log('Detectado Chrome con conexión IP, mostrando instrucciones específicas');
        setSuccess(
          'Para usar la cámara en Chrome con una IP:\n' +
          '1. Abre chrome://flags/#unsafely-treat-insecure-origin-as-secure\n' +
          '2. Agrega http://192.168.0.30:5173 a la lista\n' +
          '3. Reinicia Chrome y vuelve a intentarlo'
        );
      }
    }
  };

  // Detección con la API BarcodeDetector
  const detectWithBarcodeAPI = async (stream) => {
    try {
      // Verificar nuevamente que la API esté realmente disponible
      if (!('BarcodeDetector' in window)) {
        throw new Error('BarcodeDetector API no está disponible en este navegador');
      }
      
      // Verificar formatos soportados (si la API lo permite)
      let supportedFormats = [];
      try {
        supportedFormats = await BarcodeDetector.getSupportedFormats();
        console.log('Formatos de código de barras soportados:', supportedFormats);
      } catch (err) {
        console.warn('No se pudo determinar formatos soportados:', err);
        // Continuar con formatos predeterminados
      }
      
      // Crear detector con formatos conocidos comunes
      const barcodeDetector = new BarcodeDetector({
        formats: supportedFormats.length > 0 ? supportedFormats : 
          ['ean_13', 'ean_8', 'code_39', 'code_128', 'qr_code', 'upc_a', 'upc_e', 'data_matrix', 'aztec', 'pdf417']
      });
      
      // Procesar frames de video en loop
      const processFrame = async () => {
        if (!scanning || !videoRef.current) return;
        
        // Verificar que el video esté realmente reproduciendo
        if (videoRef.current.readyState < 2) {
          // Video no está listo, intentar en el siguiente frame
          requestAnimationFrame(processFrame);
          return;
        }
        
        try {
          // Detectar códigos en el frame actual
          const barcodes = await barcodeDetector.detect(videoRef.current);
          
          if (barcodes.length > 0) {
            // Ordenar por tamaño (área) y tomar el más grande (probablemente el más cercano)
            barcodes.sort((a, b) => {
              const areaA = (a.boundingBox?.width || 0) * (a.boundingBox?.height || 0);
              const areaB = (b.boundingBox?.width || 0) * (b.boundingBox?.height || 0);
              return areaB - areaA; // Orden descendente (más grande primero)
            });
            
            const code = barcodes[0].rawValue;
            const format = barcodes[0].format || 'desconocido';
            
            console.log(`Código detectado: ${code} (formato: ${format})`);
            const success = handleScannedCode(code);
            
            if (success) {
              // Pausa breve para evitar múltiples escaneos del mismo código
              await new Promise(r => setTimeout(r, 2000));
            }
          }
          
          if (scanning) {
            requestAnimationFrame(processFrame);
          }
        } catch (err) {
          console.error('Error al procesar frame:', err);
          
          // Si hay un error persistente, mostrar notificación solo una vez
          if (!videoRef.current._hasShownFrameError) {
            videoRef.current._hasShownFrameError = true;
            setError('Error al analizar imagen: ' + err.message);
          }
          
          // Continuar procesando a pesar del error
          if (scanning) {
            requestAnimationFrame(processFrame);
          }
        }
      };
      
      // Iniciar el proceso de detección
      processFrame();
      
    } catch (err) {
      // Fallar silenciosamente para intentar con el método alternativo
      console.error('Error al inicializar BarcodeDetector API:', err);
      setError('No se pudo iniciar el detector de códigos nativo. Usando método alternativo...');
      
      // Intentar con el método de detección de frames como fallback
      detectWithFrames(stream);
    }
  };
  
  // Detección manual frame por frame
  const detectWithFrames = (stream) => {
    // Verificar que las referencias estén disponibles
    if (!videoRef.current || !canvasRef.current) {
      console.error('Referencias a elementos de video/canvas no disponibles');
      setError('Error interno: Referencias no disponibles');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    let context;
    
    try {
      // Obtener contexto 2D del canvas
      context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('No se pudo obtener contexto 2D');
      }
    } catch (err) {
      console.error('Error al obtener contexto del canvas:', err);
      setError('Error al inicializar canvas: ' + err.message);
      return;
    }
    
    // Mostrar mensaje de que el escaner está activo, pero usando método alternativo
    setSuccess('Escáner activo (usando modo básico). Apunta al código de barras.');
    
    // Hacer visible el canvas para mostrar la imagen de la cámara
    if (canvas.style) {
      canvas.style.display = 'block';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'cover';
    }
    
    // Esta implementación básica solo muestra los frames en el canvas
    // y permite al usuario ingresar el código manualmente
    const checkFrame = () => {
      if (!scanning) return;
      
      try {
        // Verificar que el video tenga datos suficientes para dibujar
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          // Ajustar dimensiones del canvas al video
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          
          // Dibujar el frame actual en el canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Agregar una guía visual para apuntar
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const boxSize = Math.min(canvas.width, canvas.height) * 0.5;
          
          // Dibujar un rectángulo semitransparente en el centro
          context.strokeStyle = 'rgba(255, 255, 0, 0.8)';
          context.lineWidth = 4;
          context.strokeRect(
            centerX - boxSize/2, 
            centerY - boxSize/4, 
            boxSize, 
            boxSize/2
          );
          
          // Línea de escaneo animada
          const currentTime = Date.now();
          const scanLineY = centerY - boxSize/4 + (boxSize/2) * (0.5 + 0.5 * Math.sin(currentTime / 500));
          
          context.beginPath();
          context.moveTo(centerX - boxSize/2, scanLineY);
          context.lineTo(centerX + boxSize/2, scanLineY);
          context.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          context.lineWidth = 2;
          context.stroke();
          
          // Aquí es donde normalmente se implementaría la detección con una biblioteca
          // como ZXing, QuaggaJS, etc. Para esta implementación básica, no realizamos
          // la detección automática y dependemos del ingreso manual
        }
      } catch (err) {
        console.error('Error al procesar frame:', err);
      }
      
      // Continuar procesando frames mientras esté escaneando
      if (scanning) {
        requestAnimationFrame(checkFrame);
      }
    };
    
    // Iniciar procesamiento de frames
    checkFrame();
    
    // Mostrar mensaje informativo después de unos segundos
    setTimeout(() => {
      if (scanning) {
        setSuccess('Usando modo de escaneo básico. Si no detecta automáticamente, ingresa el código manualmente abajo.');
      }
    }, 5000);
  };

  // Detener el escaneo
  const stopScanner = () => {
    console.log('Deteniendo escáner de códigos de barras');
    setScanning(false);
    
    // Limpiar el stream de video con manejo robusto de errores
    try {
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          // Detener todas las pistas de medios (cámara, audio, etc)
          try {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => {
              try {
                console.log(`Deteniendo pista: ${track.kind}`);
                track.stop();
              } catch (err) {
                console.error(`Error al detener pista ${track.kind}:`, err);
              }
            });
          } catch (tracksError) {
            console.warn('Error al acceder a las tracks del stream:', tracksError);
          }
          
          // Limpiar eventos para evitar fugas de memoria
          videoRef.current.onloadedmetadata = null;
          videoRef.current.onerror = null;
          videoRef.current.onpause = null;
          
          // Eliminar la referencia al stream
          try {
            videoRef.current.srcObject = null;
          } catch (srcError) {
            console.warn('Error al limpiar srcObject:', srcError);
          }
        }
        
        // Pausar el video
        try {
          videoRef.current.pause();
        } catch (pauseError) {
          console.warn('Error al pausar video:', pauseError);
        }
      }
    } catch (err) {
      console.error('Error al limpiar recursos de video:', err);
    }
    
    // Cancelar cualquier animación o timeout pendiente
    if (window.requestAnimationFrameId) {
      cancelAnimationFrame(window.requestAnimationFrameId);
      window.requestAnimationFrameId = null;
    }
    
    // Ocultar el canvas si estaba visible
    if (canvasRef.current && canvasRef.current.style) {
      canvasRef.current.style.display = 'none';
    }
    
    // No limpiar mensajes de error para que el usuario pueda ver qué falló
    // Solo limpiar mensajes de éxito
    setSuccess('');
    // Mantener setError para que permanezca visible cualquier mensaje de error
    
    console.log('Escáner detenido y recursos liberados');
  };

  // Manejar el envío de un código escaneado o ingresado manualmente
  const handleScannedCode = (code) => {
    if (!connected || !socketInstance) {
      setError('No hay conexión con el POS');
      return false;
    }
    
    // Verificar que el código no esté vacío
    if (!code || code.trim() === '') {
      console.warn('Intento de enviar código vacío');
      return false;
    }
    
    // Verificar que la conexión esté realmente abierta
    if (socketInstance.readyState !== WebSocket.OPEN) {
      setError('La conexión con el POS está inestable. Intentando reconectar...');
      // Iniciar reconexión si la conexión está cerrada pero el estado no se ha actualizado
      if (socketInstance.readyState === WebSocket.CLOSED || socketInstance.readyState === WebSocket.CLOSING) {
        initWebSocket(sessionId);
      }
      return false;
    }
    
    // Evitar envíos duplicados en corto tiempo
    const now = Date.now();
    if (socketInstance._lastCodeSent && 
        socketInstance._lastCodeSentContent === code &&
        now - socketInstance._lastCodeSent < 2000) {
      console.log('Ignorando envío duplicado (código enviado en los últimos 2 segundos)');
      return false;
    }
    
    // Actualizar estado
    setScannedCode(code);
    
    try {
      // Verificar nuevamente el estado de la conexión
      if (socketInstance.readyState === WebSocket.OPEN) {
        const message = {
          type: 'barcode',
          code: code,
          timestamp: new Date().toISOString(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        };
        
        // Registrar el código y el momento del envío
        socketInstance._lastCodeSent = now;
        socketInstance._lastCodeSentContent = code;
        
        // Reproducir un sonido de éxito si está disponible
        try {
          const scanSound = new Audio('/assets/scan-beep.mp3');
          scanSound.play().catch(e => console.log('No se pudo reproducir sonido de escaneo'));
        } catch (e) {
          // Ignorar errores de audio (dispositivos sin soporte)
        }
        
        // Enviar el mensaje
        socketInstance.send(JSON.stringify(message));
        
        // Mostrar mensaje de éxito con tiempo limitado
        setSuccess(`Código enviado: ${code}`);
        
        // Limpiar el mensaje de éxito después de 3 segundos
        const successTimeout = setTimeout(() => {
          setSuccess(currentSuccess => 
            currentSuccess === `Código enviado: ${code}` ? '' : currentSuccess
          );
        }, 3000);
        
        // Guardar referencia al timeout para limpiar si es necesario
        socketInstance._successTimeout = successTimeout;
        
        // Verificar si recibimos confirmación después de un tiempo
        const confirmationTimeout = setTimeout(() => {
          if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
            console.log('Enviando confirmación de código enviado');
            socketInstance.send(JSON.stringify({
              type: 'barcode_sent_confirmation',
              code: code,
              originalTimestamp: message.timestamp,
              timestamp: new Date().toISOString()
            }));
          }
        }, 1500);
        
        // Guardar referencia al timeout para limpiar si es necesario
        socketInstance._confirmationTimeout = confirmationTimeout;
        
        return true; // Éxito
      } else {
        throw new Error(`Conexión no disponible (estado: ${socketInstance.readyState})`);
      }
    } catch (err) {
      setError(`Error al enviar el código: ${err.message}`);
      console.error('Error al enviar código:', err);
      return false; // Fallo
    }
  };

  // Manejar el envío manual de código
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScannedCode(manualCode.trim());
      setManualCode('');
    }
  };

  // Detectar el navegador al cargar el componente
  useEffect(() => {
    const detectBrowser = () => {
      const userAgent = navigator.userAgent;
      let name = 'Desconocido';
      let version = 'Desconocido';
      let mobile = false;
      
      // Detección de navegador móvil
      if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        mobile = true;
      }
      
      // Detección de navegadores específicos
      if (/chrome|chromium|crios/i.test(userAgent) && !/edg|edge/i.test(userAgent)) {
        name = 'Chrome';
        const match = userAgent.match(/(chrome|chromium|crios)\/(\d+)/i);
        if (match) version = match[2];
      } else if (/firefox|fxios/i.test(userAgent)) {
        name = 'Firefox';
        const match = userAgent.match(/(firefox|fxios)\/(\d+)/i);
        if (match) version = match[2];
      } else if (/safari/i.test(userAgent) && !/chrome|chromium|crios/i.test(userAgent)) {
        name = 'Safari';
        const match = userAgent.match(/version\/(\d+)/i);
        if (match) version = match[2];
      } else if (/edg|edge/i.test(userAgent)) {
        name = 'Edge';
        const match = userAgent.match(/(edg|edge)\/(\d+)/i);
        if (match) version = match[2];
      } else if (/opera|opr/i.test(userAgent)) {
        name = 'Opera';
        const match = userAgent.match(/(opera|opr)\/(\d+)/i);
        if (match) version = match[2];
      }
      
      return { name, version: parseInt(version) || 0, mobile };
    };
    
    setBrowserInfo(detectBrowser());
    console.log('Navegador detectado:', detectBrowser());
  }, []);
  
  // Limpiar recursos al desmontar el componente
  useEffect(() => {
    return () => {
      stopScanner();
      if (socketInstance) {
        socketInstance.close();
      }
    };
  }, [socketInstance]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Encabezado */}
      <div className="bg-white border-b border-slate-200 shadow-sm py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaQrcode className="text-blue-600 text-xl" />
            <h1 className="text-lg font-bold text-slate-800">Escáner de Códigos</h1>
          </div>
          
          <div className="flex items-center">
            {connected ? (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                Conectado
              </span>
            ) : connecting ? (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full flex items-center">
                <svg className="animate-spin h-3 w-3 mr-1.5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Conectando...
              </span>
            ) : (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                Desconectado
              </span>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-1">ID: {sessionId}</div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col">
        {/* Mensajes de estado */}
          {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex flex-col items-start">
            <div className="flex items-start w-full">
              <FaExclamationTriangle className="text-red-500 mr-2 mt-1 flex-shrink-0" />
              <p className="text-sm flex-grow">{error}</p>
            </div>
            {!connected && (
              <button
                onClick={() => {
                  // Reiniciar los intentos de reconexión
                  if (socketInstance) {
                    socketInstance._reconnectAttempt = 0;
                    socketInstance._isReconnecting = false;
                  }
                  initWebSocket(sessionId, 0); // Forzar intento fresco de conexión
                }}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-3 rounded-md self-end"
              >
                Reconectar manualmente
              </button>
            )}
          </div>
        )}
        
        {success && !error && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4 flex items-center">
            <div className="mr-3 flex-shrink-0">✅</div>
            <p className="text-sm">{success}</p>
          </div>
        )}        {/* Vista previa de la cámara */}
        <div className="flex flex-col items-center justify-center mb-6">
          {!sessionId ? (
            <div className="w-full max-w-sm bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <FaExclamationTriangle className="text-red-600 text-2xl" />
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-slate-800 mb-2">Sin conexión al POS</h3>
              <p className="text-slate-500 text-sm mb-4">
                Debes acceder a esta página escaneando el código QR desde la aplicación POS.
              </p>
              
              <div className="text-xs text-slate-600 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                <p><strong>Instrucciones:</strong></p>
                <ol className="text-left list-decimal pl-5 mt-2 space-y-1.5">
                  <li>Abre la página POS en tu computadora</li>
                  <li>Haz clic en el botón "Usar móvil como escáner"</li>
                  <li>Escanea el código QR con este dispositivo</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-xs text-blue-800 font-medium mb-2">¿No funciona el escáner?</p>
                <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
                  <li>Asegúrate de que el servidor WebSocket esté funcionando en 192.168.0.30:3000</li>
                  <li>Verifica que ambos dispositivos estén en la misma red WiFi</li>
                  <li>Comprueba que no haya firewalls bloqueando la conexión</li>
                  <li>Puedes verificar el estado del servidor en: http://192.168.0.30:3000/api/health-check</li>
                </ul>
              </div>
            </div>
          ) : scanning ? (
            <div className="relative w-full max-w-sm aspect-[4/3] bg-black rounded-lg overflow-hidden shadow-lg mb-3">
              <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover" 
                playsInline
                autoPlay
                muted
                id="scanner-video-element"
                onError={(e) => {
                  console.error('Error en elemento video:', e);
                  setError('Error al inicializar la cámara. Por favor usa la entrada manual de código.');
                }}
              ></video>
              <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full hidden"
              ></canvas>
              
              {/* Mensaje de error de cámara */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
                  <div className="bg-red-100 rounded-full p-3 mb-3">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">Error de cámara</h3>
                  <p className="text-white/90 text-sm mb-3">
                    {error.toString().includes("Permission denied") 
                      ? "Permiso de cámara denegado. Por favor, permite el acceso a la cámara e intenta de nuevo."
                      : error.toString().includes("getUserMedia") 
                        ? "Tu navegador no admite acceso a la cámara o la API necesaria no está disponible."
                        : `No se pudo iniciar la cámara: ${error.toString()}`}
                  </p>
                  <div className="flex flex-col w-full gap-2">
                    {/* Entrada manual de código como alternativa principal */}
                    <div className="bg-white p-3 rounded-md w-full">
                      <p className="text-sm font-medium text-slate-800 mb-2">Entrada manual de código:</p>
                      <div className="flex">
                        <input 
                          type="text" 
                          value={manualCode} 
                          onChange={(e) => setManualCode(e.target.value)} 
                          placeholder="Ingresa el código" 
                          className="flex-1 border border-slate-300 rounded-l-md px-3 py-2 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={handleManualCodeSubmit}
                          disabled={!manualCode.trim()}
                          className="bg-blue-600 text-white px-3 py-2 rounded-r-md text-sm font-medium disabled:bg-blue-400"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={stopScanner}
                      className="px-4 py-1.5 bg-white/20 text-white border border-white/30 rounded-md font-medium text-sm"
                    >
                      Cerrar escáner
                    </button>
                  </div>
                </div>
              )}
              
              {/* Marco de escaneo */}
              {!error && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-1/4 border-2 border-yellow-400 rounded-lg opacity-80 relative">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 animate-pulse"></div>
                  </div>
                </div>
              )}
              
              {scannedCode && (
                <div className="absolute bottom-3 left-0 right-0 mx-auto text-center">
                  <div className="inline-block bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm">
                    {scannedCode}
                  </div>
                </div>
              )}
              
              <button
                onClick={stopScanner}
                className="absolute top-3 left-3 bg-white rounded-full p-2 shadow-md"
              >
                <FaArrowLeft className="text-slate-700" />
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-8 text-center shadow-sm">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <FaCamera className="text-blue-600 text-2xl" />
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-slate-800 mb-2">Escáner de códigos</h3>
              <p className="text-slate-500 text-sm mb-4">
                Presiona el botón para iniciar el escaneo utilizando la cámara de tu dispositivo.
              </p>
              
              {/* Información sobre compatibilidad */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-5 text-left">
                <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Información de compatibilidad
                </h4>
                <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
                  <li>Para mejor experiencia, usa Chrome o Edge</li>
                  {browserInfo?.name === 'Chrome' && browserInfo?.mobile && (
                    <li className="font-medium text-blue-800">En Chrome móvil: Ve a Configuración &gt; Configuración de sitios &gt; Cámara y permite el acceso</li>
                  )}
                  {browserInfo?.name === 'Safari' && browserInfo?.mobile && (
                    <li className="font-medium text-blue-800">En Safari móvil: Ve a Ajustes &gt; Safari &gt; Configuración para sitios web &gt; Cámara y permite el acceso</li>
                  )}
                  {browserInfo?.name === 'Firefox' && browserInfo?.mobile && (
                    <li className="font-medium text-blue-800">En Firefox móvil: Toca los tres puntos &gt; Configuración &gt; Permisos y asegúrate que Cámara esté permitida</li>
                  )}
                  <li>Asegúrate de permitir el acceso a la cámara cuando se solicite</li>
                  <li>Si usas iOS, abre esta página en Safari</li>
                  <li>Si el escáner no funciona, puedes ingresar el código manualmente</li>
                </ul>
                <div className="mt-2 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                  {navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? 
                    <span className="text-green-700 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Tu navegador soporta acceso a cámara
                    </span> : 
                    <span className="text-red-700 flex items-center">
                      <svg className="w-3 h-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Tu navegador no soporta acceso a cámara
                    </span>}
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={startScanner}
                  disabled={!connected || !(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia))}
                  className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center ${
                    connected && navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia)
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <FaCamera className="mr-2" />
                  Iniciar escaneo
                </button>
                
                {/* Mostrar el botón de entrada manual como alternativa cuando la cámara no está disponible */}
                {!(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia)) && (
                  <button
                    onClick={() => document.getElementById('manual-code-input')?.focus()}
                    className="w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Usar entrada manual (alternativa)
                  </button>
                )}
              </div>
              
              {!(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia)) && (
                <div className="mt-3 text-xs">
                  <p className="text-red-600 bg-red-50 p-2 rounded-md border border-red-200 mb-2">
                    Tu navegador no permite acceso a la cámara. Verifica los siguientes puntos:
                  </p>
                  <div className="bg-amber-50 p-3 border border-amber-200 rounded-md">
                    <h5 className="font-semibold text-amber-800 mb-2">Soluciones para conexiones IP (192.168.0.30):</h5>
                    <ul className="list-disc pl-5 space-y-1 text-amber-700">
                      <li>En Chrome, escribe <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code> en la barra de direcciones</li>
                      <li>Agrega <code>http://192.168.0.30:5173</code> a la lista de sitios permitidos</li>
                      <li>Reinicia Chrome después de habilitar esta configuración</li>
                      <li>Verifica que no tengas bloqueados los permisos de cámara para este sitio</li>
                      <li>Como alternativa, usa la opción de entrada manual de códigos</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Entrada manual de código */}
        <div className="w-full max-w-sm mx-auto mt-4">
          <div className={`bg-white rounded-lg p-4 border ${
            !(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia))
              ? "border-emerald-300 shadow-md" 
              : "border-slate-200 shadow-sm"
          }`}>
            <h3 className={`font-medium mb-3 flex items-center ${
              !(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia))
                ? "text-base text-emerald-700" 
                : "text-sm text-slate-700"
            }`}>
              {!(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia)) && (
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full mr-2">
                  Recomendado
                </span>
              )}
              Entrada manual de código
            </h3>
            <form onSubmit={handleManualSubmit} className="flex">
              <input
                id="manual-code-input"
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Ingresa código de barras..."
                className={`flex-1 border rounded-l-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 ${
                  !(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia))
                    ? "border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50" 
                    : "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                }`}
              />
              <button
                type="submit"
                disabled={!connected || !manualCode.trim()}
                className={`px-4 py-2 rounded-r-lg text-sm ${
                  connected && manualCode.trim() 
                    ? !(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia))
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
              >
                Enviar
              </button>
            </form>
            
            {!(navigator && ((navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || navigator.getUserMedia)) && (
              <p className="mt-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-200">
                La entrada manual es la mejor opción cuando la cámara no está disponible en conexiones IP.
                Simplemente ingresa el código y presiona "Enviar".
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BarcodeScanner;