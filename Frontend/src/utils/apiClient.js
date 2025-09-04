import axios from 'axios';

// URL fija para la API
const API_BASE_URL = 'http://192.168.0.30:3000/api';

// Configuración base de axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Timeout para detectar problemas de red
  timeout: 15000, // 15 segundos
});

// Interceptor para agregar el token de autenticación
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Almacena información sobre errores de red para mostrar mensajes más claros
let networkErrorInfo = {
  count: 0,
  lastError: null,
  timestamp: null
};

// Evento personalizado para notificar a los componentes sobre problemas de red
export const API_ERROR_EVENT = 'api-connection-error';
export const API_RECONNECT_EVENT = 'api-reconnect-success';

// Función para emitir eventos de error de API
const emitApiErrorEvent = (errorType, errorDetails) => {
  const event = new CustomEvent(API_ERROR_EVENT, { 
    detail: { 
      type: errorType, 
      message: errorDetails.message,
      code: errorDetails.code,
      timestamp: new Date()
    } 
  });
  window.dispatchEvent(event);
};

// Función para emitir eventos de reconexión exitosa
const emitApiReconnectEvent = () => {
  const event = new CustomEvent(API_RECONNECT_EVENT);
  window.dispatchEvent(event);
};

// Función para comprobar la conectividad del API
export const checkApiConnection = async () => {
  try {
    await apiClient.get('/health-check');
    
    // Si la conexión fue exitosa después de un error, emitir evento de reconexión
    if (networkErrorInfo.count > 0) {
      networkErrorInfo.count = 0;
      networkErrorInfo.lastError = null;
      emitApiReconnectEvent();
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar la conexión API:', error);
    return false;
  }
};

// Interceptor para respuestas
apiClient.interceptors.response.use(
  (response) => {
    // Si había errores de red anteriores y ahora funciona, resetear contador
    if (networkErrorInfo.count > 0) {
      networkErrorInfo.count = 0;
      networkErrorInfo.lastError = null;
      // Solo emitir evento de reconexión si antes había error
      emitApiReconnectEvent();
    }
    return response;
  },
  (error) => {
    // Lista de endpoints cuyos errores queremos silenciar
    const silencedEndpoints = [
      '/shifts/active',           // Endpoint que puede fallar
      '/shifts/',                 // Posibles endpoints de turnos que fallen
      '/totals',                  // Endpoints relacionados con totales
      '/health-check'             // Endpoint para comprobar conectividad
    ];
    
    // Verificar si el error proviene de un endpoint silenciado
    const shouldSilenceError = silencedEndpoints.some(endpoint => 
      error.config && error.config.url && error.config.url.includes(endpoint)
    );
    
    // Manejar errores de autenticación (401)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Detectar específicamente errores de red
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                          (error.message && error.message.includes('Network Error')) ||
                          (!error.response && error.request);
    
    // Para errores de red, incrementar el contador y guardar información
    if (isNetworkError) {
      networkErrorInfo.count++;
      networkErrorInfo.lastError = error;
      networkErrorInfo.timestamp = new Date();
      
      // Solo emitir un evento de error cada 3 errores o cada 10 segundos
      // para evitar sobrecarga de notificaciones
      const shouldEmitEvent = networkErrorInfo.count % 3 === 1 || 
                             (networkErrorInfo.timestamp && 
                             (new Date() - networkErrorInfo.timestamp > 10000));
      
      // Emitir evento solo si no está silenciado y cumple los criterios
      if (!shouldSilenceError && shouldEmitEvent) {
        emitApiErrorEvent('network', {
          message: 'No se pudo conectar al servidor (192.168.0.30)',
          code: error.code
        });
      }
    }
    
    // Solo mostrar errores para endpoints que no están silenciados
    if (!shouldSilenceError) {
      // Manejo global de errores
      if (error.response) {
        // La solicitud fue realizada y el servidor respondió con un código de estado
        // que cae fuera del rango de 2xx
        console.error('Error en solicitud API:', error);
        console.error('Respuesta del servidor con error:', error.response.data);
        console.error('Estado HTTP:', error.response.status);
      } else if (error.request) {
        // La solicitud fue realizada pero no se recibió respuesta
        console.error('Error en solicitud API:', error);
        console.error('No se recibió respuesta del servidor');
      } else {
        // Algo ocurrió en la configuración de la solicitud que desencadenó un error
        console.error('Error en solicitud API:', error);
        console.error('Error al configurar la solicitud:', error.message);
      }
    }

    return Promise.reject(error);
  }
);

// Funciones de API para usuarios
export const userApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (userData) => apiClient.put('/auth/profile', userData),
  changePassword: (passwordData) => apiClient.post('/auth/change-password', passwordData),
  getAll: () => apiClient.get('/users'),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (userData) => apiClient.post('/users', userData),
  update: (id, userData) => apiClient.put(`/users/${id}`, userData),
  delete: (id) => apiClient.delete(`/users/${id}`),
};

// Funciones de API para turnos
export const shiftApi = {
  getAll: (params) => apiClient.get('/shifts', { params }),
  getById: (id) => apiClient.get(`/shifts/${id}`),
  getActive: (userId) => apiClient.get(`/shifts?userId=${userId}&active=true`),
  open: (shiftData) => apiClient.post('/shifts', shiftData),
  close: (id, shiftData) => apiClient.put(`/shifts/${id}/close`, shiftData),
  getSummary: (id) => apiClient.get(`/shifts/${id}/summary`),
};

// Funciones de API para productos
export const productApi = {
  getAll: (params) => apiClient.get('/products', { params }),
  getById: (id) => apiClient.get(`/products/${id}`),
  create: (productData) => apiClient.post('/products', productData),
  update: (id, productData) => apiClient.put(`/products/${id}`, productData),
  delete: (id) => apiClient.delete(`/products/${id}`),
  search: (query) => apiClient.get(`/products/search?query=${query}`),
  updateStock: (id, stockData) => apiClient.post(`/products/${id}/stock`, stockData),
  getCategories: () => apiClient.get('/categories'),
};

// Funciones de API para categorías
export const categoryApi = {
  getAll: () => apiClient.get('/categories'),
  getById: (id) => apiClient.get(`/categories/${id}`),
  create: (categoryData) => apiClient.post('/categories', categoryData),
  update: (id, categoryData) => apiClient.put(`/categories/${id}`, categoryData),
  delete: (id) => apiClient.delete(`/categories/${id}`),
};

// Funciones de API para clientes
export const clientApi = {
  getAll: (params) => apiClient.get('/clients', { params }),
  getById: (id) => apiClient.get(`/clients/${id}`),
  create: (clientData) => apiClient.post('/clients', clientData),
  update: (id, clientData) => apiClient.put(`/clients/${id}`, clientData),
  delete: (id) => apiClient.delete(`/clients/${id}`),
  search: (query) => apiClient.get(`/clients/search?query=${query}`),
  getSales: (id) => apiClient.get(`/clients/${id}/sales`),
};

// Funciones de API para ventas
export const saleApi = {
  getAll: (params) => apiClient.get('/sales', { params }),
  getById: (id) => apiClient.get(`/sales/${id}`),
  create: (saleData) => apiClient.post('/sales', saleData),
  cancel: (id, reason) => apiClient.put(`/sales/${id}/cancel`, { reason }),
  searchProducts: (query) => apiClient.get(`/sales/search-products?query=${query}`),
  getReceipt: (id) => apiClient.get(`/sales/${id}/receipt`),
};

// Funciones de API para reportes
export const reportApi = {
  getSalesByDate: (params) => apiClient.get('/reports/sales', { params }),
  getInventory: () => apiClient.get('/reports/inventory'),
  getLowStock: () => apiClient.get('/reports/low-stock'),
  getProductSales: (params) => apiClient.get('/reports/product-sales', { params }),
};

// Funciones de API para proveedores
export const supplierApi = {
  getAll: (params) => apiClient.get('/suppliers', { params }),
  getById: (id) => apiClient.get(`/suppliers/${id}`),
  create: (supplierData) => apiClient.post('/suppliers', supplierData),
  update: (id, supplierData) => apiClient.put(`/suppliers/${id}`, supplierData),
  delete: (id) => apiClient.delete(`/suppliers/${id}`),
  search: (query) => apiClient.get(`/suppliers/search?query=${query}`),
  getBalance: (id) => apiClient.get(`/suppliers/${id}/balance`),
  getPurchases: (id) => apiClient.get(`/suppliers/${id}/purchases`),
};

// Funciones de API para compras
export const purchaseApi = {
  getAll: (params) => apiClient.get('/purchases', { params }),
  getById: (id) => apiClient.get(`/purchases/${id}`),
  create: (purchaseData) => apiClient.post('/purchases', purchaseData),
  update: (id, purchaseData) => apiClient.put(`/purchases/${id}`, purchaseData),
  delete: (id) => apiClient.delete(`/purchases/${id}`),
  addPayment: (id, paymentData) => apiClient.post(`/purchases/${id}/payments`, paymentData),
  getReport: (params) => apiClient.get('/reports/purchases', { params }),
};

export default apiClient;
