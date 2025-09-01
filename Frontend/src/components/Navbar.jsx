import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? "bg-blue-700" : "";
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button 
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-20 p-2 rounded-md bg-blue-600 text-white"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed top-0 left-0 z-10 h-full w-64 bg-blue-800 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:z-0`}>
        <div className="p-5">
          <h1 className="text-xl font-bold mb-8">Sistema de Ventas</h1>
          
          <nav className="space-y-2">
            <Link 
              to="/" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors hover:bg-blue-700 ${isActive('/')}`}
              onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            
            <Link 
              to="/sales" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors hover:bg-blue-700 ${isActive('/sales')}`}
              onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ventas
            </Link>
            
            <Link 
              to="/supplier-payments" 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors hover:bg-blue-700 ${isActive('/supplier-payments')}`}
              onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pagos a Proveedores
            </Link>
          </nav>
        </div>
      </div>
    </>
  )
}

export default Sidebar