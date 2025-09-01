import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <div className="min-h-screen bg-slate-100 relative flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:pt-6 lg:p-8 lg:pl-80 overflow-y-auto transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
