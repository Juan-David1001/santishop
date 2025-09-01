import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import axios from 'axios';

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    taxId: '',
    notes: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  const [detailsSupplier, setDetailsSupplier] = useState(null);
  const [supplierAccount, setSupplierAccount] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    description: '',
    purchaseId: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, [pagination.page, pagination.limit, searchQuery]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        query: searchQuery || undefined
      };
      
      const response = await axios.get('/api/suppliers', { params });
      setSuppliers(response.data.suppliers || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Error al cargar los proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setCurrentSupplier(supplier);
      setFormData({
        name: supplier.name || '',
        contactName: supplier.contactName || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        taxId: supplier.taxId || '',
        notes: supplier.notes || ''
      });
    } else {
      setCurrentSupplier(null);
      setFormData({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        taxId: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentSupplier(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }
    
    try {
      if (currentSupplier) {
        // Actualizar proveedor existente
        await axios.put(`/api/suppliers/${currentSupplier.id}`, formData);
        toast.success('Proveedor actualizado correctamente');
      } else {
        // Crear nuevo proveedor
        await axios.post('/api/suppliers', formData);
        toast.success('Proveedor creado correctamente');
      }
      
      closeModal();
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(error.response?.data?.error || 'Error al guardar el proveedor');
    }
  };

  const handleDelete = async (supplier) => {
    if (window.confirm(`¿Estás seguro de eliminar al proveedor ${supplier.name}?`)) {
      try {
        await axios.delete(`/api/suppliers/${supplier.id}`);
        toast.success('Proveedor eliminado correctamente');
        loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        toast.error(error.response?.data?.error || 'Error al eliminar el proveedor');
      }
    }
  };

  const loadSupplierDetails = async (supplier) => {
    setDetailsSupplier(supplier);
    setIsLoading(true);
    
    try {
      const response = await axios.get(`/api/suppliers/${supplier.id}/account`);
      setSupplierAccount(response.data);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Error loading supplier details:', error);
      toast.error('Error al cargar detalles del proveedor');
    } finally {
      setIsLoading(false);
    }
  };

  const openPaymentModal = (supplier) => {
    setDetailsSupplier(supplier);
    setPaymentData({
      amount: '',
      description: `Pago a ${supplier.name}`,
      purchaseId: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error('El monto del pago debe ser mayor a cero');
      return;
    }
    
    try {
      await axios.post('/api/purchases/payment', {
        supplierId: detailsSupplier.id,
        amount: parseFloat(paymentData.amount),
        userId: 1, // Temporal: se debería obtener del usuario logueado
        purchaseId: paymentData.purchaseId || null,
        description: paymentData.description
      });
      
      toast.success('Pago registrado correctamente');
      setIsPaymentModalOpen(false);
      
      // Si el modal de detalles está abierto, actualizar la información
      if (isDetailsModalOpen) {
        loadSupplierDetails(detailsSupplier);
      }
      
      loadSuppliers(); // Recargar la lista para actualizar el saldo
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error(error.response?.data?.error || 'Error al registrar el pago');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Proveedores</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, contacto o documento fiscal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de proveedores */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No se encontraron proveedores
                  </td>
                </tr>
              ) : (
                suppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      {supplier.taxId && <div className="text-sm text-gray-500">ID Fiscal: {supplier.taxId}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.contactName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-medium ${supplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(supplier.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => loadSupplierDetails(supplier)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Detalles
                        </button>
                        {supplier.balance > 0 && (
                          <button
                            onClick={() => openPaymentModal(supplier)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Pago
                          </button>
                        )}
                        <button
                          onClick={() => openModal(supplier)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{suppliers.length}</span> de{' '}
            <span className="font-medium">{pagination.total}</span> resultados
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page <= 1}
              className={`px-3 py-1 rounded ${
                pagination.page <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Anterior
            </button>
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                // Mostrar páginas alrededor de la página actual
                let pageToShow;
                if (totalPages <= 5) {
                  pageToShow = i + 1;
                } else if (pagination.page <= 3) {
                  pageToShow = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageToShow = totalPages - 4 + i;
                } else {
                  pageToShow = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => setPagination(prev => ({ ...prev, page: pageToShow }))}
                    className={`px-3 py-1 rounded ${
                      pagination.page === pageToShow
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageToShow}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={pagination.page >= totalPages}
              className={`px-3 py-1 rounded ${
                pagination.page >= totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal para crear/editar proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">
              {currentSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Nombre*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="contactName">
                  Nombre de Contacto
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                  Teléfono
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="taxId">
                  ID Fiscal / RFC
                </label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                  Dirección
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
                  Notas
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="mr-2 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {currentSupplier ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles del proveedor */}
      {isDetailsModalOpen && detailsSupplier && supplierAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">Detalles del Proveedor</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Información del Proveedor</h3>
                <div className="space-y-2">
                  <p><strong>Nombre:</strong> {detailsSupplier.name}</p>
                  {detailsSupplier.contactName && <p><strong>Contacto:</strong> {detailsSupplier.contactName}</p>}
                  {detailsSupplier.phone && <p><strong>Teléfono:</strong> {detailsSupplier.phone}</p>}
                  {detailsSupplier.email && <p><strong>Email:</strong> {detailsSupplier.email}</p>}
                  {detailsSupplier.taxId && <p><strong>ID Fiscal:</strong> {detailsSupplier.taxId}</p>}
                  {detailsSupplier.address && <p><strong>Dirección:</strong> {detailsSupplier.address}</p>}
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Resumen de Cuenta</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Total compras:</span>
                    <span>{formatCurrency(supplierAccount.summary.totalPurchases)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total pagos:</span>
                    <span>{formatCurrency(supplierAccount.summary.totalPayments)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="font-bold">Saldo pendiente:</span>
                    <span className={`font-bold ${supplierAccount.summary.pendingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(supplierAccount.summary.pendingBalance)}
                    </span>
                  </div>
                  
                  {supplierAccount.summary.pendingBalance > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => openPaymentModal(detailsSupplier)}
                        className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Registrar Pago
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Compras</h3>
              {supplierAccount.purchases.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Este proveedor no tiene compras registradas</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {supplierAccount.purchases.map(purchase => (
                        <tr key={purchase.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(purchase.purchaseDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {purchase.invoiceNumber || `#${purchase.id}`}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                            {formatCurrency(purchase.totalAmount)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                            {formatCurrency(purchase.paidAmount)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-red-600">
                            {formatCurrency(purchase.totalAmount - purchase.paidAmount)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              purchase.status === 'paid' ? 'bg-green-100 text-green-800' :
                              purchase.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {purchase.status === 'paid' ? 'Pagado' :
                               purchase.status === 'partially_paid' ? 'Parcial' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Pagos</h3>
              {supplierAccount.payments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay pagos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {supplierAccount.payments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {payment.description || 'Pago a proveedor'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {payment.user?.name || 'Usuario'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-green-600">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para registrar pago */}
      {isPaymentModalOpen && detailsSupplier && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">Registrar Pago a Proveedor</h2>
            
            <form onSubmit={submitPayment}>
              <div className="mb-4">
                <p className="font-medium">{detailsSupplier.name}</p>
                {detailsSupplier.balance > 0 && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Saldo pendiente:</span> <span className="text-red-600">{formatCurrency(detailsSupplier.balance)}</span>
                  </p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                  Monto del Pago*
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handlePaymentInputChange}
                  step="0.01"
                  min="0.01"
                  max={detailsSupplier.balance}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Si estamos en la vista de cuenta, mostrar selección de compra */}
              {supplierAccount && supplierAccount.purchases.some(p => p.status !== 'paid') && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="purchaseId">
                    Aplicar a Compra (Opcional)
                  </label>
                  <select
                    id="purchaseId"
                    name="purchaseId"
                    value={paymentData.purchaseId}
                    onChange={handlePaymentInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Sin asociar a compra --</option>
                    {supplierAccount.purchases
                      .filter(p => p.status !== 'paid')
                      .map(purchase => (
                        <option key={purchase.id} value={purchase.id}>
                          {purchase.invoiceNumber || `#${purchase.id}`} - {formatCurrency(purchase.totalAmount - purchase.paidAmount)} pendiente
                        </option>
                      ))}
                  </select>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={paymentData.description}
                  onChange={handlePaymentInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="mr-2 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
