import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';
import axios from 'axios';

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
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Compras</h1>
        <button
          onClick={openPurchaseModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Compra
        </button>
      </div>

      {/* Filtros de búsqueda */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-lg mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select
              name="supplierId"
              value={searchQuery.supplierId}
              onChange={handleSearchInputChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input
              type="date"
              name="startDate"
              value={searchQuery.startDate}
              onChange={handleSearchInputChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <input
              type="date"
              name="endDate"
              value={searchQuery.endDate}
              onChange={handleSearchInputChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="status"
              value={searchQuery.status}
              onChange={handleSearchInputChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="partially_paid">Parcialmente Pagado</option>
              <option value="paid">Pagado</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 mr-2"
          >
            Limpiar Filtros
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Tabla de compras */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No se encontraron compras
                  </td>
                </tr>
              ) : (
                purchases.map(purchase => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {purchase.invoiceNumber || `#${purchase.id}`}
                      </div>
                      {purchase.dueDate && (
                        <div className="text-xs text-gray-500">
                          Vence: {new Date(purchase.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{purchase.supplier?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className={`font-medium ${purchase.paidAmount >= purchase.totalAmount ? 'text-green-600' : 'text-gray-900'}`}>
                        {formatCurrency(purchase.paidAmount)}
                      </div>
                      {purchase.paidAmount < purchase.totalAmount && (
                        <div className="text-xs text-red-600">
                          {formatCurrency(purchase.totalAmount - purchase.paidAmount)} pendiente
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        purchase.status === 'paid' ? 'bg-green-100 text-green-800' :
                        purchase.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {purchase.status === 'paid' ? 'Pagado' :
                         purchase.status === 'partially_paid' ? 'Parcial' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewPurchase(purchase)}
                        className="text-indigo-600 hover:text-indigo-900 mx-1"
                      >
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
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{purchases.length}</span> de{' '}
            <span className="font-medium">{pagination.total}</span> compras
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

      {/* Modal para crear una nueva compra */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPurchaseModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">Registrar Nueva Compra</h2>
            
            <form onSubmit={handleSubmitPurchase}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor*</label>
                  <select
                    name="supplierId"
                    value={purchaseFormData.supplierId}
                    onChange={handlePurchaseFormChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={purchaseFormData.items.length === 0}
                >
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles de compra */}
      {isPurchaseDetailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPurchaseDetailModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">
              Detalle de Compra {selectedPurchase.invoiceNumber || `#${selectedPurchase.id}`}
            </h2>
            
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseManagement;
