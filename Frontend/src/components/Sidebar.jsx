import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeShifts, setActiveShifts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const location = useLocation();

  // Detectar si es dispositivo móvil y cargar información de turnos
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    // Cargar turnos activos
    loadActiveShifts();
    
    // Configurar un intervalo para actualizar los turnos cada minuto
    const intervalId = setInterval(loadActiveShifts, 60000);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
      clearInterval(intervalId);
    };
  }, []);
  
  // Función para cargar los turnos activos
  const loadActiveShifts = async () => {
    try {
      // Primero intentar con /shifts/active (endpoint específico)
      const response = await apiClient.get('/shifts/active');
      setActiveShifts(response.data);
      if (response.data && response.data.length > 0) {
        setCurrentShift(response.data[0]);
      } else {
        setCurrentShift(null);
      }
    } catch (err) {
      console.error('Error loading active shifts:', err);
      
      // Si el primer método falla, intentar con el otro método (con parámetro active=true)
      try {
        const fallbackResponse = await apiClient.get('/shifts', { params: { active: true } });
        setActiveShifts(fallbackResponse.data);
        if (fallbackResponse.data && fallbackResponse.data.length > 0) {
          setCurrentShift(fallbackResponse.data[0]);
        } else {
          setCurrentShift(null);
        }
      } catch (fallbackErr) {
        console.error('Error en segundo intento para cargar turnos:', fallbackErr);
        // Manejar el caso de error silenciosamente para no romper la UI
        setActiveShifts([]);
        setCurrentShift(null);
      }
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? "bg-gradient-to-r from-blue-800 to-blue-700 text-white" : "text-blue-100 hover:bg-blue-800/50";
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between bg-blue-900 px-4 py-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-xl text-white">Sistema de Ventas</span>
        <div className="w-10"></div> {/* Spacer for balance */}
      </div>

      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 z-30 flex flex-col overflow-hidden`}>
        <div className="flex flex-col p-5 border-b border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Sistema de Ventas</h1>
            {isMobile && (
              <button 
                onClick={toggleSidebar} 
                className="p-1 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Quick status indicator */}
          <Link 
            to="/shifts" 
            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              currentShift ? 'bg-green-600/30 hover:bg-green-600/40' : 'bg-red-600/20 hover:bg-red-600/30'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${currentShift ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium">
                {currentShift ? 'Turno activo' : 'Sin turno activo'}
              </span>
            </div>
            <span className="text-xs bg-blue-800/50 px-2 py-1 rounded">Ver →</span>
          </Link>
        </div>
        
        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-blue-800">
          <nav className="p-4 space-y-2">
            <Link 
              to="/" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </Link>
            
            <Link 
              to="/pos" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/pos')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Punto de Venta</span>
            </Link>
            
            <Link 
              to="/sales" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/sales')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Historial Ventas</span>
            </Link>
            
            <div className="my-4 border-t border-blue-800"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-blue-300 tracking-wider">Inventario</h3>
            </div>
            
            <Link 
              to="/inventory" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/inventory')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="font-medium">Productos</span>
            </Link>
            
            <Link 
              to="/categories" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/categories')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-medium">Categorías</span>
            </Link>
            
            <Link 
              to="/inventory-reports" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/inventory-reports')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">Reportes</span>
            </Link>
            
            <div className="my-4 border-t border-blue-800"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-blue-300 tracking-wider">Clientes</h3>
            </div>
            
            <Link 
              to="/clients" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/clients')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-medium">Clientes</span>
            </Link>
            
            <div className="my-4 border-t border-blue-800"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-blue-300 tracking-wider">Proveedores</h3>
            </div>
            
            <Link 
              to="/suppliers" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/suppliers')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-medium">Proveedores</span>
            </Link>
            
            <Link 
              to="/purchases" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/purchases')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="font-medium">Compras</span>
            </Link>
            
            <Link 
              to="/supplier-payments" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/supplier-payments')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-medium">Pagos a Proveedores</span>
            </Link>
            
            <div className="my-4 border-t border-blue-800"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-blue-300 tracking-wider">Reportes</h3>
            </div>

            <Link 
              to="/reports" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/reports')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="font-medium">Reportes Avanzados</span>
            </Link>

            <div className="my-4 border-t border-blue-800"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-blue-300 tracking-wider">Administración</h3>
            </div>
            
            <Link 
              to="/users" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/users')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="font-medium">Usuarios</span>
            </Link>
            
            <Link 
              to="/shifts" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/shifts')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Turnos</span>
            </Link>
            
            <Link 
              to="/shift-closures" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/shift-closures')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Cierres de Caja</span>
            </Link>
          </nav>
        </div>
        
        <div className="p-4 border-t border-blue-800">
          {/* Indicador de turno activo */}
          {currentShift ? (
            <div className="mb-4 bg-green-600/30 rounded-lg p-3 text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="font-medium text-green-300">Turno Activo</p>
              </div>
              <p className="text-white">
                {currentShift.user ? (
                  <>Usuario: <span className="font-medium">{currentShift.user.name}</span></>
                ) : (
                  'Usuario: No especificado'
                )}
              </p>
              <p className="text-blue-200 text-xs mt-1">ID: {currentShift.id}</p>
            </div>
          ) : (
            <div className="mb-4 bg-red-600/20 rounded-lg p-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                <p className="font-medium text-red-300">No hay turno activo</p>
              </div>
              <p className="text-gray-300 text-xs mt-1">
                <Link to="/shifts" className="text-blue-300 hover:text-blue-200">
                  Ir a gestión de turnos →
                </Link>
              </p>
            </div>
          )}
          
          <div className="bg-blue-800/50 rounded-lg p-3 text-sm">
            <p className="font-medium">Sistema de Ventas v1.0</p>
            <p className="text-blue-200">© 2025 - Todos los derechos reservados</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar
