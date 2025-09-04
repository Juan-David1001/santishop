import { useState, useEffect } from 'react';
import { RiWifiOffLine, RiRefreshLine, RiCloseLine } from 'react-icons/ri';
import { API_ERROR_EVENT, API_RECONNECT_EVENT, checkApiConnection } from '../utils/apiClient';

function NetworkErrorAlert() {
  const [visible, setVisible] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Escuchar eventos de error de API
    const handleApiError = (event) => {
      setErrorInfo(event.detail);
      setVisible(true);
    };

    // Escuchar eventos de reconexión exitosa
    const handleApiReconnect = () => {
      setVisible(false);
      setErrorInfo(null);
      setIsRetrying(false);
    };

    // Registrar los listeners de eventos
    window.addEventListener(API_ERROR_EVENT, handleApiError);
    window.addEventListener(API_RECONNECT_EVENT, handleApiReconnect);

    // Limpiar los listeners al desmontar
    return () => {
      window.removeEventListener(API_ERROR_EVENT, handleApiError);
      window.removeEventListener(API_RECONNECT_EVENT, handleApiReconnect);
    };
  }, []);

  // Función para reintentar la conexión
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const isConnected = await checkApiConnection();
      if (isConnected) {
        setVisible(false);
        setErrorInfo(null);
      } else {
        // La comprobación falló pero no lanzó error, mantener alerta visible
      }
    } catch (error) {
      console.error("Error al reintentar conexión:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  // No mostrar nada si no hay error visible
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pb-safe animate-slideUp">
      <div className="mx-auto max-w-md px-3 mb-3">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg shadow-lg overflow-hidden">
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <RiWifiOffLine className="h-5 w-5 text-red-500 dark:text-red-400" />
              </div>
              
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error de conexión
                </h3>
                <div className="mt-1 text-xs text-red-700 dark:text-red-200">
                  <p>No se pudo conectar con el servidor API (192.168.0.30).</p>
                  <p className="mt-1">Verifica que estés conectado a la red correcta.</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <>
                        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Reintentando...
                      </>
                    ) : (
                      <>
                        <RiRefreshLine className="-ml-0.5 mr-1.5 h-4 w-4" />
                        Reintentar conexión
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="ml-3 flex-shrink-0">
                <button
                  onClick={() => setVisible(false)}
                  className="inline-flex text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 focus:outline-none"
                >
                  <RiCloseLine className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NetworkErrorAlert;