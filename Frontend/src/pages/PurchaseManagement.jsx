import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import axios from 'axios';
import '../styles/SupplierManagement.css';

const PurchaseManagement = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPurchaseDetailModalOpen, setIsPurchaseDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchaseFormData, setPurchaseFormData] = useState({
    supplierId: '',
    invoiceNumber: '',
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: []
  });
  
  const [searchQuery, setSearchQuery] = useState({
    supplierId: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  const [currentProductSearch, setCurrentProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
    loadProducts();
  }, [pagination.page, pagination.limit, searchQuery]);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        supplierId: searchQuery.supplierId || undefined,
        startDate: searchQuery.startDate || undefined,
        endDate: searchQuery.endDate || undefined,
        status: searchQuery.status || undefined
      };
      
      const response = await axios.get('/api/purchases', { params });
      setPurchases(response.data.purchases || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error loading purchases:', error);
      toast.error('Error al cargar las compras');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await axios.get('/api/suppliers', { 
        params: { 
          limit: 100,
          status: 'active'
        } 
      });
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get('/api/products', { params: { limit: 500 } });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSearchInputChange = (e) => {
    const { name, value } = e.target;
    setSearchQuery({
      ...searchQuery,
      [name]: value
    });
  };

  const resetFilters = () => {
    setSearchQuery({
      supplierId: '',
      startDate: '',
      endDate: '',
      status: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openPurchaseModal = () => {
    setPurchaseFormData({
      supplierId: '',
      invoiceNumber: '',
      totalAmount: 0,
      paidAmount: 0,
      notes: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      items: []
    });
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseFormChange = (e) => {
    const { name, value } = e.target;
    setPurchaseFormData({
      ...purchaseFormData,
      [name]: value
    });

    // Actualizar monto total si se cambia el pago inicial
    if (name === 'paidAmount') {
      updateTotalAmount();
    }
  };

  const handleProductSearch = (e) => {
    const query = e.target.value;
    setCurrentProductSearch(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const results = products.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(query.toLowerCase())) ||
      (product.barcode && product.barcode.toLowerCase().includes(query.toLowerCase()))
    );
    
    setSearchResults(results.slice(0, 10));
  };

  const addProductToItems = (product) => {
    const newItem = {
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitCost: product.costPrice,
      totalCost: product.costPrice
    };
    
    setPurchaseFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    setCurrentProductSearch('');
    setSearchResults([]);
    
    // Actualizar monto total
    updateTotalAmount([...purchaseFormData.items, newItem]);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...purchaseFormData.items];
    updatedItems[index][field] = value;
    
    // Recalcular el costo total del ítem
    if (field === 'quantity' || field === 'unitCost') {
      updatedItems[index].totalCost = 
        parseFloat(updatedItems[index].quantity || 0) * 
        parseFloat(updatedItems[index].unitCost || 0);
    }
    
    setPurchaseFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    // Actualizar monto total
    updateTotalAmount(updatedItems);
  };

  const updateTotalAmount = (items = purchaseFormData.items) => {
    const total = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    
    setPurchaseFormData(prev => ({
      ...prev,
      totalAmount: total
    }));
  };

  const removeItem = (index) => {
    const updatedItems = purchaseFormData.items.filter((_, i) => i !== index);
    
    setPurchaseFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    // Actualizar monto total
    updateTotalAmount(updatedItems);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    
    if (!purchaseFormData.supplierId) {
      toast.error('Debe seleccionar un proveedor');
      return;
    }
    
    if (purchaseFormData.items.length === 0) {
      toast.error('Debe agregar al menos un producto');
      return;
    }
    
    try {
      const purchaseData = {
        ...purchaseFormData,
        userId: 1, // Temporal: debería ser el usuario logueado
        supplierId: parseInt(purchaseFormData.supplierId),
        totalAmount: parseFloat(purchaseFormData.totalAmount),
        paidAmount: parseFloat(purchaseFormData.paidAmount || 0),
        items: purchaseFormData.items.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitCost: parseFloat(item.unitCost)
        }))
      };
      
      await axios.post('/api/purchases', purchaseData);
      
      toast.success('Compra registrada correctamente');
      setIsPurchaseModalOpen(false);
      loadPurchases();
    } catch (error) {
      console.error('Error registering purchase:', error);
      toast.error(error.response?.data?.error || 'Error al registrar la compra');
    }
  };

  const handleViewPurchase = async (purchase) => {
    try {
      const response = await axios.get(`/api/purchases/${purchase.id}`);
      setSelectedPurchase(response.data);
      setIsPurchaseDetailModalOpen(true);
    } catch (error) {
      console.error('Error loading purchase details:', error);
      toast.error('Error al cargar detalles de la compra');
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="container mx-auto px-4 py-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <div className="icon-wrapper mr-3">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <span className="header-gradient bg-clip-text text-transparent">Gestión de Compras</span>
        </h1>
        <button
          onClick={openPurchaseModal}
          className="btn-primary btn-glow flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Compra
        </button>
      </div>

      {/* Filtros de búsqueda */}
      <div className="card-neomorphic p-5 mb-6 animate-slideInLeft">
        <h2 className="font-semibold text-lg mb-3 flex items-center text-purple-700">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros de Búsqueda
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <select
                name="supplierId"
                value={searchQuery.supplierId}
                onChange={handleSearchInputChange}
                className="input-neomorphic w-full pl-10 pr-3 py-2 appearance-none"
              >
                <option value="">Todos los proveedores</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                name="startDate"
                value={searchQuery.startDate}
                onChange={handleSearchInputChange}
                className="input-neomorphic w-full pl-10 pr-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="date"
                name="endDate"
                value={searchQuery.endDate}
                onChange={handleSearchInputChange}
                className="input-neomorphic w-full pl-10 pr-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <select
                name="status"
                value={searchQuery.status}
                onChange={handleSearchInputChange}
                className="input-neomorphic w-full pl-10 pr-3 py-2 appearance-none"
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="partially_paid">Parcialmente Pagado</option>
                <option value="paid">Pagado</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-5 flex justify-end">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-white shadow-sm text-gray-700 rounded-md hover:bg-gray-50 transition-all mr-3 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar Filtros
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
            className="btn-primary flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar
          </button>
        </div>
      </div>

      {/* Tabla de compras */}
      <div className="card-neomorphic animate-slideInRight">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Factura</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Pagado</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="loading-spinner mb-3"></div>
                      <p className="text-sm text-gray-500 mt-2">Cargando compras...</p>
                    </div>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10">
                    <div className="empty-state">
                      <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No hay compras</h3>
                      <p className="text-sm text-gray-500">No se encontraron compras con los criterios de búsqueda.</p>
                      <button 
                        onClick={openPurchaseModal} 
                        className="mt-3 btn-primary flex items-center mx-auto"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Registrar nueva compra
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase, index) => (
                  <tr key={purchase.id} className="table-row" style={{animationDelay: `${index * 0.05}s`}}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {purchase.invoiceNumber || `#${purchase.id}`}
                      </div>
                      {purchase.dueDate && (
                        <div className="text-xs mt-1">
                          <span className="badge badge-warning">
                            Vence: {new Date(purchase.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 flex items-center">
                        <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {purchase.supplier?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className="badge badge-primary">
                        {formatCurrency(purchase.totalAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className={`font-medium ${purchase.paidAmount >= purchase.totalAmount ? 'badge badge-success' : 'badge badge-primary'}`}>
                        {formatCurrency(purchase.paidAmount)}
                      </div>
                      {purchase.paidAmount < purchase.totalAmount && (
                        <div className="text-xs mt-1">
                          <span className="badge badge-danger">
                            {formatCurrency(purchase.totalAmount - purchase.paidAmount)} pendiente
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`badge ${
                        purchase.status === 'paid' ? 'badge-success' :
                        purchase.status === 'partially_paid' ? 'badge-warning' :
                        'badge-danger'
                      }`}>
                        {purchase.status === 'paid' ? 'Pagado' :
                         purchase.status === 'partially_paid' ? 'Parcial' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewPurchase(purchase)}
                        className="text-indigo-600 hover:text-indigo-900 mx-1 hover:underline flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detalles
                      </button>
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
            Mostrando <span className="font-medium text-purple-600">{purchases.length}</span> de{' '}
            <span className="font-medium text-purple-600">{pagination.total}</span> compras
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
            {/* Números de página */}
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
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

      {/* Modal para crear una nueva compra */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-card w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Registrar Nueva Compra
              </h2>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 bg-white rounded-b-lg">
            
            <form onSubmit={handleSubmitPurchase}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor*</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <select
                      name="supplierId"
                      value={purchaseFormData.supplierId}
                      onChange={handlePurchaseFormChange}
                      className="input-neomorphic w-full pl-10 pr-3 py-2 appearance-none"
                      required
                    >
                      <option value="">Seleccionar proveedor</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={purchaseFormData.invoiceNumber}
                    onChange={handlePurchaseFormChange}
                    placeholder="Factura #123"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={purchaseFormData.purchaseDate}
                    onChange={handlePurchaseFormChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={purchaseFormData.dueDate}
                    onChange={handlePurchaseFormChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  name="notes"
                  value={purchaseFormData.notes}
                  onChange={handlePurchaseFormChange}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Información adicional sobre la compra..."
                ></textarea>
              </div>
              
              {/* Búsqueda de productos */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Agregar Productos</h3>
                <div className="flex">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar producto por nombre, SKU o código de barras..."
                      value={currentProductSearch}
                      onChange={handleProductSearch}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map(product => (
                          <div
                            key={product.id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                            onClick={() => addProductToItems(product)}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">
                              SKU: {product.sku} | Stock: {product.stock} | Costo: {formatCurrency(product.costPrice)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Lista de productos */}
              <div className="mb-6">
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unitario</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseFormData.items.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-3 py-4 text-center text-gray-500">
                            Agregue productos a la compra
                          </td>
                        </tr>
                      ) : (
                        purchaseFormData.items.map((item, index) => (
                          <tr key={index} className={selectedItemIndex === index ? 'bg-blue-50' : ''}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{item.name}</div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                min="1"
                                className="w-full text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.unitCost}
                                onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                                min="0"
                                step="0.01"
                                className="w-full text-right px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatCurrency(item.totalCost || 0)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Resumen de la compra */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Resumen</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total productos:</span>
                      <span>{purchaseFormData.items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total unidades:</span>
                      <span>
                        {purchaseFormData.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total a pagar:</span>
                      <span>{formatCurrency(purchaseFormData.totalAmount || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-2">Pago Inicial</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto pagado inicialmente
                    </label>
                    <input
                      type="number"
                      name="paidAmount"
                      value={purchaseFormData.paidAmount}
                      onChange={handlePurchaseFormChange}
                      min="0"
                      max={purchaseFormData.totalAmount}
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {purchaseFormData.paidAmount > 0 && purchaseFormData.totalAmount > purchaseFormData.paidAmount && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-medium">Saldo pendiente: </span>
                      <span className="text-red-600">
                        {formatCurrency(purchaseFormData.totalAmount - purchaseFormData.paidAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="mr-2 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={purchaseFormData.items.length === 0}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* Modal de detalles de compra */}
      {isPurchaseDetailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-card w-full max-w-4xl relative max-h-[90vh] overflow-y-auto">
            <div className="modal-header flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Detalle de Compra {selectedPurchase.invoiceNumber || `#${selectedPurchase.id}`}
              </h2>
              <button
                onClick={() => setIsPurchaseDetailModalOpen(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 bg-white rounded-b-lg">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Información de la Compra</h3>
                <div className="space-y-2">
                  <p><strong>Proveedor:</strong> {selectedPurchase.supplier?.name}</p>
                  <p><strong>Fecha:</strong> {new Date(selectedPurchase.purchaseDate).toLocaleDateString()}</p>
                  {selectedPurchase.dueDate && (
                    <p><strong>Fecha de Vencimiento:</strong> {new Date(selectedPurchase.dueDate).toLocaleDateString()}</p>
                  )}
                  <p><strong>Registrado por:</strong> {selectedPurchase.user?.name}</p>
                  {selectedPurchase.notes && <p><strong>Notas:</strong> {selectedPurchase.notes}</p>}
                </div>
              </div>
              
              <div className={`${
                selectedPurchase.status === 'paid' ? 'bg-green-50' : 
                selectedPurchase.status === 'partially_paid' ? 'bg-yellow-50' : 'bg-red-50'
              } p-4 rounded-lg`}>
                <h3 className="font-bold text-lg mb-2">Estado Financiero</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Total compra:</span>
                    <span>{formatCurrency(selectedPurchase.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total pagado:</span>
                    <span>{formatCurrency(selectedPurchase.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold">Saldo pendiente:</span>
                    <span className={`font-bold ${
                      selectedPurchase.totalAmount > selectedPurchase.paidAmount ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(selectedPurchase.totalAmount - selectedPurchase.paidAmount)}
                    </span>
                  </div>
                  <div className="pt-2">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedPurchase.status === 'paid' ? 'bg-green-100 text-green-800' :
                      selectedPurchase.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedPurchase.status === 'paid' ? 'Pagado' :
                       selectedPurchase.status === 'partially_paid' ? 'Parcialmente Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Productos</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Unit.</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPurchase.purchaseItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-3 py-2 font-bold text-gray-700">Total</td>
                      <td className="px-3 py-2 text-center font-bold">
                        {selectedPurchase.purchaseItems.reduce((sum, item) => sum + item.quantity, 0)}
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 text-right font-bold">
                        {formatCurrency(selectedPurchase.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {selectedPurchase.payments && selectedPurchase.payments.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-2">Pagos Realizados</h3>
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
                      {selectedPurchase.payments.map(payment => (
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
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-3 py-2 font-bold text-gray-700">Total Pagado</td>
                        <td className="px-3 py-2 text-right font-bold text-green-600">
                          {formatCurrency(selectedPurchase.payments.reduce((sum, p) => sum + p.amount, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsPurchaseDetailModalOpen(false)}
                className="btn-primary flex items-center"
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
    </div>
  );
};

export default PurchaseManagement;
