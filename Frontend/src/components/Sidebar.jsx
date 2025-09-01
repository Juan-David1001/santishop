import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { 
  RiDashboardLine, RiStore3Line, RiHistoryLine, RiArchiveLine, RiPriceTag3Line,
  RiBarChartBoxLine, RiUserLine, RiTeamLine, RiBuildingLine, RiShoppingBag3Line,
  RiMoneyDollarBoxLine, RiFileChartLine, RiUserSettingsLine, RiTimeLine,
  RiFileList3Line, RiMenuLine, RiCloseLine, RiArrowRightSLine
} from 'react-icons/ri';

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
    return location.pathname === path 
      ? "bg-indigo-600/15 text-indigo-100 border-l-4 border-indigo-500" 
      : "text-gray-300 hover:bg-slate-800/40 hover:text-gray-100 border-l-4 border-transparent";
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between bg-slate-900 px-4 py-3 shadow-lg">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-200 hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Toggle menu"
        >
          <RiMenuLine className="w-6 h-6" />
        </button>
        <span className="font-bold text-xl text-white">Sistema de Ventas</span>
        <div className="w-10"></div> {/* Spacer for balance */}
      </div>

      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-0 left-0 h-full w-72 bg-slate-900 text-white shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 z-30 flex flex-col overflow-hidden`}>
        <div className="flex flex-col p-5 border-b border-slate-800/80 bg-slate-800/30">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white">Sistema de Ventas</h1>
            {isMobile && (
              <button 
                onClick={toggleSidebar} 
                className="p-1 rounded-md hover:bg-slate-700/50 transition-colors"
                aria-label="Close menu"
              >
                <RiCloseLine className="w-6 h-6" />
              </button>
            )}
          </div>
          
          {/* Quick status indicator */}
          <Link 
            to="/shifts" 
            className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${
              currentShift ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'bg-red-500/10 hover:bg-red-500/15'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className={`h-2.5 w-2.5 rounded-full ${currentShift ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium">
                {currentShift ? 'Turno activo' : 'Sin turno activo'}
              </span>
            </div>
            <span className="text-xs font-medium flex items-center gap-1 bg-slate-800/70 px-2 py-1 rounded-md">
              Ver <RiArrowRightSLine className="text-sm" />
            </span>
          </Link>
        </div>
        
        <div className="overflow-y-auto flex-1 bg-gradient-to-b from-slate-900 to-slate-950 sidebar-scrollbar">
          <nav className="p-4 space-y-1.5">
            <Link 
              to="/" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiDashboardLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Dashboard</span>
            </Link>
            
            <Link 
              to="/pos" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/pos')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiStore3Line className="w-5 h-5 mr-4" />
              <span className="font-medium">Punto de Venta</span>
            </Link>
            
            <Link 
              to="/sales" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/sales')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiHistoryLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Historial Ventas</span>
            </Link>
            
            <div className="my-4 border-t border-slate-700/30"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Inventario</h3>
            </div>
            
            <Link 
              to="/inventory" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/inventory')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiArchiveLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Productos</span>
            </Link>
            
            <Link 
              to="/categories" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/categories')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiPriceTag3Line className="w-5 h-5 mr-4" />
              <span className="font-medium">Categorías</span>
            </Link>
            
            <Link 
              to="/inventory-reports" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/inventory-reports')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiBarChartBoxLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Reportes</span>
            </Link>
            
            <div className="my-4 border-t border-slate-700/30"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Clientes</h3>
            </div>
            
            <Link 
              to="/clients" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/clients')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiTeamLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Clientes</span>
            </Link>
            
            <div className="my-4 border-t border-slate-700/30"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Proveedores</h3>
            </div>
            
            <Link 
              to="/suppliers" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/suppliers')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiBuildingLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Proveedores</span>
            </Link>
            
            <Link 
              to="/purchases" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/purchases')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiShoppingBag3Line className="w-5 h-5 mr-4" />
              <span className="font-medium">Compras</span>
            </Link>
            
            <Link 
              to="/supplier-payments" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/supplier-payments')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiMoneyDollarBoxLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Pagos a Proveedores</span>
            </Link>
            
            <div className="my-4 border-t border-slate-700/30"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Reportes</h3>
            </div>

            <Link 
              to="/reports" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/reports')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiFileChartLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Reportes Avanzados</span>
            </Link>

            <div className="my-4 border-t border-slate-700/30"></div>
            
            <div className="px-4 py-2">
              <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Administración</h3>
            </div>
            
            <Link 
              to="/users" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/users')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiUserSettingsLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Usuarios</span>
            </Link>
            
            <Link 
              to="/shifts" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/shifts')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiTimeLine className="w-5 h-5 mr-4" />
              <span className="font-medium">Turnos</span>
            </Link>
            
            <Link 
              to="/shift-closures" 
              className={`flex items-center px-4 py-3 rounded-md transition-colors ${isActive('/shift-closures')}`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <RiFileList3Line className="w-5 h-5 mr-4" />
              <span className="font-medium">Cierres de Caja</span>
            </Link>
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-800/70 bg-slate-800/20">
          {/* Indicador de turno activo */}
          {currentShift ? (
            <div className="mb-4 bg-emerald-500/10 rounded-lg p-3 text-sm border border-emerald-500/20 shadow-sm">
              <div className="flex items-center space-x-2 mb-1">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="font-medium text-emerald-300">Turno Activo</p>
              </div>
              <p className="text-white">
                {currentShift.user ? (
                  <>Usuario: <span className="font-medium">{currentShift.user.name}</span></>
                ) : (
                  'Usuario: No especificado'
                )}
              </p>
              <p className="text-slate-400 text-xs mt-1">ID: {currentShift.id}</p>
            </div>
          ) : (
            <div className="mb-4 bg-red-500/10 rounded-lg p-3 text-sm border border-red-500/20 shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                <p className="font-medium text-red-300">No hay turno activo</p>
              </div>
              <p className="text-gray-300 text-xs mt-1">
                <Link to="/shifts" className="text-indigo-300 hover:text-indigo-200 transition-colors">
                  Ir a gestión de turnos →
                </Link>
              </p>
            </div>
          )}
          
        
        </div>
      </aside>
    </>
  );
}

export default Sidebar
