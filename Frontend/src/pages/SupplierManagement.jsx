import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import axios from 'axios';
import '../styles/SupplierManagement.css';

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
    <div className="container mx-auto px-4 py-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <div className="icon-wrapper mr-3">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="header-gradient bg-clip-text text-transparent">Gestión de Proveedores</span>
        </h1>
        <button
          onClick={() => openModal()}
          className="btn-primary btn-glow flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="filter-section animate-slideInLeft mb-6 card-neomorphic">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, contacto o documento fiscal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-neomorphic w-full pl-10 pr-4 py-2 border-0 rounded-md focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all hover:shadow-md flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de proveedores */}
      <div className="card-neomorphic animate-slideInRight">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="loading-spinner mb-3"></div>
                      <p className="text-sm text-gray-500 mt-2">Cargando proveedores...</p>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10">
                    <div className="empty-state">
                      <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No hay proveedores</h3>
                      <p className="text-sm text-gray-500">No se encontraron proveedores con los criterios de búsqueda.</p>
                      <button 
                        onClick={() => openModal()} 
                        className="mt-3 btn-primary flex items-center mx-auto"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Crear nuevo proveedor
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier, index) => (
                  <tr key={supplier.id} className="table-row" style={{animationDelay: `${index * 0.05}s`}}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      {supplier.taxId && <div className="text-sm text-gray-500 mt-1">
                        <span className="badge badge-primary">ID Fiscal: {supplier.taxId}</span>
                      </div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.contactName ? (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {supplier.contactName}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.phone ? (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {supplier.phone}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-medium ${supplier.balance > 0 ? 'badge badge-danger' : 'badge badge-success'}`}>
                        {formatCurrency(supplier.balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${
                        supplier.status === 'active' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => loadSupplierDetails(supplier)}
                          className="text-indigo-600 hover:text-indigo-900 hover:underline flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Detalles
                        </button>
                        {supplier.balance > 0 && (
                          <button
                            onClick={() => openPaymentModal(supplier)}
                            className="text-green-600 hover:text-green-900 hover:underline flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                            Pago
                          </button>
                        )}
                        <button
                          onClick={() => openModal(supplier)}
                          className="text-blue-600 hover:text-blue-900 hover:underline flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="text-red-600 hover:text-red-900 hover:underline flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
        <div className="mt-6 flex justify-between items-center animate-fadeIn">
          <div className="text-sm text-gray-700 bg-white p-2 rounded-lg shadow-sm">
            Mostrando <span className="font-medium text-purple-600">{suppliers.length}</span> de{' '}
            <span className="font-medium text-purple-600">{pagination.total}</span> resultados
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page <= 1}
              className={`px-3 py-1 rounded-md transition-all transform ${
                pagination.page <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Anterior
              </div>
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
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
                      pagination.page === pageToShow
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow'
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
              className={`px-3 py-1 rounded-md transition-all transform ${
                pagination.page >= totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center">
                Siguiente
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modal para crear/editar proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-card w-full max-w-md">
            <div className="modal-header flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {currentSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button
                onClick={closeModal}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                    Nombre*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="input-neomorphic w-full pl-10 pr-3 py-2"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="contactName">
                    Nombre de Contacto
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="contactName"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      className="input-neomorphic w-full pl-10 pr-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                      Teléfono
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="input-neomorphic w-full pl-10 pr-3 py-2"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input-neomorphic w-full pl-10 pr-3 py-2"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="taxId">
                    ID Fiscal / RFC
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="taxId"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleInputChange}
                      className="input-neomorphic w-full pl-10 pr-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                    Dirección
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="input-neomorphic w-full pl-10 pr-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
                    Notas
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </div>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="input-neomorphic w-full pl-10 pr-3 py-2"
                      rows="3"
                    ></textarea>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {currentSupplier ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles del proveedor */}
      {isDetailsModalOpen && detailsSupplier && supplierAccount && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Detalles del Proveedor
              </h2>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="card-neomorphic p-4 animate-slideInLeft">
                  <h3 className="font-bold text-lg mb-4 flex items-center text-purple-700">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Información del Proveedor
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center border-b border-purple-100 pb-2">
                      <span className="font-medium w-1/3 text-gray-700">Nombre:</span>
                      <span className="text-gray-800">{detailsSupplier.name}</span>
                    </div>
                    
                    {detailsSupplier.contactName && (
                      <div className="flex items-center border-b border-purple-100 pb-2">
                        <span className="font-medium w-1/3 text-gray-700">Contacto:</span>
                        <span className="text-gray-800">{detailsSupplier.contactName}</span>
                      </div>
                    )}
                    
                    {detailsSupplier.phone && (
                      <div className="flex items-center border-b border-purple-100 pb-2">
                        <span className="font-medium w-1/3 text-gray-700">Teléfono:</span>
                        <span className="text-gray-800">{detailsSupplier.phone}</span>
                      </div>
                    )}
                    
                    {detailsSupplier.email && (
                      <div className="flex items-center border-b border-purple-100 pb-2">
                        <span className="font-medium w-1/3 text-gray-700">Email:</span>
                        <span className="text-gray-800">{detailsSupplier.email}</span>
                      </div>
                    )}
                    
                    {detailsSupplier.taxId && (
                      <div className="flex items-center border-b border-purple-100 pb-2">
                        <span className="font-medium w-1/3 text-gray-700">ID Fiscal:</span>
                        <span className="text-gray-800">{detailsSupplier.taxId}</span>
                      </div>
                    )}
                    
                    {detailsSupplier.address && (
                      <div className="flex items-center border-b border-purple-100 pb-2">
                        <span className="font-medium w-1/3 text-gray-700">Dirección:</span>
                        <span className="text-gray-800">{detailsSupplier.address}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="card-neomorphic p-4 animate-slideInRight" style={{animationDelay: '0.1s'}}>
                  <h3 className="font-bold text-lg mb-4 flex items-center text-purple-700">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Resumen de Cuenta
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-purple-100 pb-3">
                      <span className="font-medium text-gray-700">Total compras:</span>
                      <span className="badge badge-primary">{formatCurrency(supplierAccount.summary.totalPurchases)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-purple-100 pb-3">
                      <span className="font-medium text-gray-700">Total pagos:</span>
                      <span className="badge badge-success">{formatCurrency(supplierAccount.summary.totalPayments)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold text-gray-700">Saldo pendiente:</span>
                      <span className={`badge ${supplierAccount.summary.pendingBalance > 0 ? 'badge-danger' : 'badge-success'}`}>
                        {formatCurrency(supplierAccount.summary.pendingBalance)}
                      </span>
                    </div>
                    
                    {supplierAccount.summary.pendingBalance > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() => openPaymentModal(detailsSupplier)}
                          className="btn-primary btn-glow w-full py-2 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Registrar Pago
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mb-6 card-neomorphic p-4 animate-slideInLeft" style={{animationDelay: '0.2s'}}>
                <h3 className="font-bold text-lg mb-4 flex items-center text-purple-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Compras
                </h3>
                {supplierAccount.purchases.length === 0 ? (
                  <div className="empty-state py-6">
                    <svg className="empty-icon mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="text-gray-500 mt-2">Este proveedor no tiene compras registradas</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="table-header text-xs rounded-t-lg">
                          <th className="px-3 py-2 text-left uppercase tracking-wider">Fecha</th>
                          <th className="px-3 py-2 text-left uppercase tracking-wider">Factura</th>
                          <th className="px-3 py-2 text-right uppercase tracking-wider">Monto</th>
                          <th className="px-3 py-2 text-right uppercase tracking-wider">Pagado</th>
                          <th className="px-3 py-2 text-right uppercase tracking-wider">Pendiente</th>
                          <th className="px-3 py-2 text-center uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {supplierAccount.purchases.map((purchase, index) => (
                          <tr key={purchase.id} className="table-row" style={{animationDelay: `${index * 0.05}s`}}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {new Date(purchase.purchaseDate).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-800">
                              {purchase.invoiceNumber || `#${purchase.id}`}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium">
                              {formatCurrency(purchase.totalAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                              {formatCurrency(purchase.paidAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                              {formatCurrency(purchase.totalAmount - purchase.paidAmount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <span className={`badge ${
                                purchase.status === 'paid' ? 'badge-success' :
                                purchase.status === 'partially_paid' ? 'badge-warning' :
                                'badge-danger'
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
              
              <div className="mb-6 card-neomorphic p-4 animate-slideInRight" style={{animationDelay: '0.3s'}}>
                <h3 className="font-bold text-lg mb-4 flex items-center text-purple-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Pagos
                </h3>
                {supplierAccount.payments.length === 0 ? (
                  <div className="empty-state py-6">
                    <svg className="empty-icon mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 mt-2">No hay pagos registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="table-header text-xs rounded-t-lg">
                          <th className="px-3 py-2 text-left uppercase tracking-wider">Fecha</th>
                          <th className="px-3 py-2 text-left uppercase tracking-wider">Descripción</th>
                          <th className="px-3 py-2 text-left uppercase tracking-wider">Usuario</th>
                          <th className="px-3 py-2 text-right uppercase tracking-wider">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {supplierAccount.payments.map((payment, index) => (
                          <tr key={payment.id} className="table-row" style={{animationDelay: `${index * 0.05}s`}}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-800">
                              {payment.description || 'Pago a proveedor'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                              {payment.user?.name || 'Usuario'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                              <span className="badge badge-success">{formatCurrency(payment.amount)}</span>
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
                  className="px-6 py-2 bg-white text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-all flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para registrar pago */}
      {isPaymentModalOpen && detailsSupplier && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-card w-full max-w-md">
            <div className="modal-header flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Registrar Pago a Proveedor
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={submitPayment} className="space-y-4">
                <div className="card-neomorphic p-3 bg-purple-50">
                  <p className="font-medium text-purple-700">{detailsSupplier.name}</p>
                  {detailsSupplier.balance > 0 && (
                    <div className="flex items-center mt-2 bg-white p-2 rounded-md shadow-sm">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Saldo pendiente:</span> 
                      <span className="badge badge-danger ml-2">{formatCurrency(detailsSupplier.balance)}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="amount">
                    Monto del Pago*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={paymentData.amount}
                      onChange={handlePaymentInputChange}
                      step="0.01"
                      min="0.01"
                      max={detailsSupplier.balance}
                      className="input-neomorphic w-full pl-10 pr-3 py-2"
                      required
                    />
                  </div>
                </div>
                
                {/* Si estamos en la vista de cuenta, mostrar selección de compra */}
                {supplierAccount && supplierAccount.purchases.some(p => p.status !== 'paid') && (
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="purchaseId">
                      Aplicar a Compra (Opcional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <select
                        id="purchaseId"
                        name="purchaseId"
                        value={paymentData.purchaseId}
                        onChange={handlePaymentInputChange}
                        className="input-neomorphic w-full pl-10 pr-3 py-2 appearance-none"
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
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                    Descripción
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <textarea
                      id="description"
                      name="description"
                      value={paymentData.description}
                      onChange={handlePaymentInputChange}
                      className="input-neomorphic w-full pl-10 pr-3 py-2"
                      rows="2"
                    ></textarea>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Registrar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
