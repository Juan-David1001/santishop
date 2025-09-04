import { useState, useEffect } from 'react';
import { updateApiBaseUrl } from '../utils/apiClient';
import { RiSettingsLine, RiCloseLine, RiCheckLine, RiErrorWarningLine, RiInformationLine } from 'react-icons/ri';

function ApiConfigModal({ isOpen, onClose }) {
  const [apiUrl, setApiUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Al abrir el modal, cargar la URL actual desde localStorage
  useEffect(() => {
    if (isOpen) {
      const currentUrl = localStorage.getItem('apiBaseUrl') || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      setApiUrl(currentUrl);
      setOriginalUrl(currentUrl);
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    setIsSaving(true);
    setError('');

    // Validar que la URL tiene un formato válido
    if (!apiUrl || !isValidUrl(apiUrl)) {
      setError('Por favor, ingresa una URL válida');
      setIsSaving(false);
      return;
    }

    try {
      // Actualizar la URL base de la API
      const result = updateApiBaseUrl(apiUrl);
      
      if (result) {
        setSuccess(true);
        
        // Mostrar mensaje de éxito por 1.5 segundos antes de cerrar el modal
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      } else {
        setError('No se pudo actualizar la URL de la API');
      }
    } catch (err) {
      console.error('Error updating API URL:', err);
      setError('Error al actualizar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  // Función para validar el formato de la URL
  const isValidUrl = (urlString) => {
    try {
      new URL(urlString);
      return true;
    } catch (err) {
      return false;
    }
  };

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  // Prevenir que los toques en el modal propaguen eventos al fondo
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={handleModalClick}
      >
        <div className="p-4 border-b dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <RiSettingsLine className="mr-2 flex-shrink-0" />
            <span className="truncate">Configuración de API</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none ml-2 p-1.5 flex-shrink-0"
            aria-label="Cerrar"
          >
            <RiCloseLine className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="flex items-center p-3 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <RiCheckLine className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
              <p className="text-sm text-green-700 dark:text-green-300">
                ¡Configuración guardada correctamente!
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Configura la URL base de la API para conectarte al servidor backend. Esta configuración
                  se guardará en tu navegador y se usará para todas las peticiones.
                </p>
                
                <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-md mt-2">
                  <RiInformationLine className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-medium">URL actual:</span> {originalUrl}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {localStorage.getItem('apiBaseUrl') 
                        ? 'Estás usando una configuración personalizada'
                        : 'Estás usando la configuración por defecto'}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <RiErrorWarningLine className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL del servidor API
                </label>
                <input
                  type="text"
                  id="apiUrl"
                  className="w-full border-gray-300 dark:border-gray-700 dark:bg-slate-900 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://192.168.1.100:3000/api"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ejemplo: http://192.168.1.100:3000/api o http://localhost:3000/api
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => {
                    setApiUrl(originalUrl);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 mb-2 sm:mb-0 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
                  disabled={isSaving}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 flex items-center justify-center"
                  disabled={isSaving}
                  type="button"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiConfigModal;