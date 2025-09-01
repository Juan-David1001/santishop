import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function Layout() {
  return (
    <div className="min-h-screen bg-gray-100 relative flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:pt-4 lg:p-6 lg:pl-80 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
