import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import NetworkErrorAlert from './NetworkErrorAlert';

function Layout() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Detectar si es dispositivo móvil
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth < 1024;
      setIsMobile(isMobileView);
      // Mantener sidebar abierto en desktop, cerrado en móvil por defecto
      setSidebarOpen(isMobileView ? false : isHovered);
    };
    
    // Verificar inicialmente
    checkIfMobile();
    
    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [isHovered]);

  // Función para controlar el estado del sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Funciones para manejar el hover en la barra lateral (solo en desktop)
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
      setSidebarOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 relative flex flex-col lg:flex-row">
      {/* Pasamos el estado y función de toggle al sidebar */}
      <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="lg:z-30"
      >
        <Sidebar 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar} 
          isMobile={isMobile}
          isHovered={isHovered}
        />
      </div>
      
      {/* Overlay para cerrar sidebar en móvil */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      <main className={`
        flex-1 
        p-3 sm:p-4 
        pt-16 lg:pt-6 
        ${isMobile ? '' : 'lg:p-6 xl:p-8'}
        ${sidebarOpen && !isMobile ? 'lg:pl-80' : 'lg:pl-24'}
        overflow-y-auto 
        transition-all duration-300
      `}>
        <div className="w-full max-w-7xl mx-auto">
          <Outlet />
        </div>
        
        {/* Alerta de error de red */}
        <NetworkErrorAlert />
      </main>
    </div>
  );
}

export default Layout;
