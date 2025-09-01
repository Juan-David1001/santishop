import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './App.css'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import SupplierPayments from './pages/SupplierPayments'
import UserManagement from './pages/UserManagement'
import ShiftManagement from './pages/ShiftManagement'
import ShiftClosures from './pages/ShiftClosures'
import Inventory from './pages/Inventory'
import ProductDetail from './pages/ProductDetail'
import Categories from './pages/Categories'
import InventoryReports from './pages/InventoryReports'
import Reports from './pages/Reports'
import POS from './pages/POS'
import ClientManagement from './pages/ClientManagement'
import SupplierManagement from './pages/SupplierManagement'
import PurchaseManagement from './pages/PurchaseManagement'

function App() {
  return (
    <Router>
      {/* Configuración global del Toaster */}
      <Toaster 
        position="top-right"
        toastOptions={{
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              padding: '12px 16px',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
              color: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              padding: '12px 16px',
            },
          },
          custom: {
            duration: 3500,
            style: {
              background: '#4F46E5', // indigo-600
              color: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              padding: '12px 16px',
            },
          },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/supplier-payments" element={<SupplierPayments />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/shifts" element={<ShiftManagement />} />
          <Route path="/shift-closures" element={<ShiftClosures />} />
          
          {/* Nuevas rutas para la gestión de inventario */}
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/inventory-reports" element={<InventoryReports />} />
          <Route path="/reports" element={<Reports />} />
          
          {/* Punto de Venta (POS) y Clientes */}
          <Route path="/pos" element={<POS />} />
          <Route path="/clients" element={<ClientManagement />} />
          
          {/* Gestión de Proveedores y Compras */}
          <Route path="/suppliers" element={<SupplierManagement />} />
          <Route path="/purchases" element={<PurchaseManagement />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
