import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import NetworkErrorAlert from './NetworkErrorAlert';

function Layout() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar si es dispositivo móvil
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Verificar inicialmente
    checkIfMobile();
    
    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 relative flex flex-col lg:flex-row">
      <Sidebar />
      <main className={`
        flex-1 
        p-3 sm:p-4 
        pt-16 lg:pt-6 
        lg:p-6 xl:p-8 
        lg:pl-80 
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
