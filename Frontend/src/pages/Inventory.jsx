import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';
// Importando iconos para mejorar la UI
import { RiAddLine, RiSearchLine, RiEditLine, RiDeleteBin6Line, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    name: '',
    categoryId: '',
    lowStock: false
  });
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minimumStock: '5',
    categoryId: ''
  });
  const [valuation, setValuation] = useState({
    totalCostValue: 0,
    totalSellingValue: 0,
    potentialProfit: 0,
    potentialProfitMargin: 0
  });

  // Función para cargar productos
  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      
      if (filters.name) params.append('name', filters.name);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.lowStock) params.append('lowStock', 'true');
      
      const response = await apiClient.get(`/products?${params.toString()}`);
      setProducts(response.data.products);
      setValuation(response.data.valuation);
      setTotalPages(response.data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError('Error al cargar productos: ' + err.message);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar categorías
  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      toast.error('Error al cargar categorías');
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadCategories();
  }, []);

  // Efecto para cargar productos cuando cambian los filtros o la página
  useEffect(() => {
    loadProducts();
  }, [currentPage, filters]);

  // Función para manejar el cambio de filtros
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setCurrentPage(1); // Reset a la primera página cuando cambian los filtros
  };

  // Función para manejar el cambio en el formulario de nuevo producto
  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para agregar un nuevo producto
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/products', newProduct);
      toast.success(`Producto ${response.data.name} creado exitosamente`);
      setNewProduct({
        sku: '',
        name: '',
        description: '',
        costPrice: '',
        sellingPrice: '',
        stock: '',
        minimumStock: '5',
        categoryId: ''
      });
      setShowAddProduct(false);
      loadProducts();
    } catch (err) {
      toast.error('Error al crear producto: ' + err.response?.data?.error || err.message);
    }
  };

  // Función para agregar o quitar stock
  const handleStockMovement = async (productId, type, quantity) => {
    try {
      await apiClient.post(`/products/${productId}/stock-movements`, {
        quantity,
        type,
        reference: `Ajuste manual`,
        notes: `Ajuste manual realizado desde la interfaz`
      });
      toast.success('Movimiento de stock registrado correctamente');
      loadProducts();
    } catch (err) {
      toast.error('Error al actualizar stock: ' + err.response?.data?.error || err.message);
    }
  };

  // Función para eliminar un producto
  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Está seguro de eliminar el producto "${productName}"?`)) {
      try {
        await apiClient.delete(`/products/${productId}`);
        toast.success(`Producto "${productName}" eliminado correctamente`);
        loadProducts();
      } catch (err) {
        toast.error('Error al eliminar producto: ' + err.response?.data?.error || err.message);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
        <button
          onClick={() => setShowAddProduct(!showAddProduct)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg shadow-sm transition-all duration-200 ${showAddProduct ? 'bg-gray-600 hover:bg-gray-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-medium`}
        >
          {showAddProduct ? (
            'Cancelar'
          ) : (
            <>
              <RiAddLine className="text-lg" /> Agregar Producto
            </>
          )}
        </button>
      </div>

      {/* Formulario para agregar producto */}
      {showAddProduct && (
        <div className="bg-white p-8 mb-8 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b border-gray-100 pb-3">Agregar Nuevo Producto</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">SKU</label>
              <input
                type="text"
                name="sku"
                value={newProduct.sku}
                onChange={handleProductFormChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                name="name"
                value={newProduct.name}
                onChange={handleProductFormChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">Descripción</label>
              <textarea
                name="description"
                value={newProduct.description}
                onChange={handleProductFormChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                rows="3"
              ></textarea>
            </div>
            <div>
              <label className="block mb-1">Costo Unitario</label>
              <input
                type="number"
                name="costPrice"
                value={newProduct.costPrice}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Precio de Venta</label>
              <input
                type="number"
                name="sellingPrice"
                value={newProduct.sellingPrice}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Stock Inicial</label>
              <input
                type="number"
                name="stock"
                value={newProduct.stock}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                min="0"
              />
            </div>
            <div>
              <label className="block mb-1">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                name="minimumStock"
                value={newProduct.minimumStock}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Categoría</label>
              <select
                name="categoryId"
                value={newProduct.categoryId}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                required
              >
                <option value="">Seleccione una categoría</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-8 rounded-lg shadow-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                <RiAddLine className="text-lg" /> Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 mb-8 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
          <RiSearchLine className="text-indigo-500" /> Filtros de Búsqueda
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Nombre o SKU</label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                className="w-full pl-10 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200"
                placeholder="Buscar por nombre o SKU"
              />
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Categoría</label>
            <select
              name="categoryId"
              value={filters.categoryId}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 bg-white"
            >
              <option value="">Todas las categorías</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <div className="flex items-center h-full pt-7">
              <input
                type="checkbox"
                id="lowStock"
                name="lowStock"
                checked={filters.lowStock}
                onChange={handleFilterChange}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="lowStock" className="ml-2 text-gray-700">Mostrar solo productos con stock bajo</label>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de valorización */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-l-4 border-blue-500 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-sm text-gray-500 font-medium uppercase tracking-wide">Valor de Costo Total</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.totalCostValue)}</p>
        </div>
        <div className="bg-white border-l-4 border-green-500 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-sm text-gray-500 font-medium uppercase tracking-wide">Valor de Venta Total</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.totalSellingValue)}</p>
        </div>
        <div className="bg-white border-l-4 border-indigo-500 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-sm text-gray-500 font-medium uppercase tracking-wide">Ganancia Potencial</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.potentialProfit)}</p>
        </div>
        <div className="bg-white border-l-4 border-gray-500 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-sm text-gray-500 font-medium uppercase tracking-wide">Margen de Ganancia</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">{valuation.potentialProfitMargin.toFixed(2)}%</p>
        </div>
      </div>

      {/* Tabla de productos */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-md border border-gray-100">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 mb-4 rounded-full bg-indigo-200"></div>
            <p className="text-gray-600 font-medium">Cargando productos...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-red-500 text-2xl">⚠️</span>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Costo</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Venta</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No hay productos que coincidan con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{product.name}</span>
                          {product.description && (
                            <span className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.category.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`px-3 py-1.5 rounded-full font-medium ${
                            product.stock <= product.minimumStock
                              ? 'bg-red-100 text-red-800'
                              : product.stock <= product.minimumStock * 1.5
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {product.stock}
                          </span>
                          {product.stock <= product.minimumStock && (
                            <span className="ml-2 text-red-500 text-xs font-medium">⚠️ Bajo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-700 font-medium">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.costPrice)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-900 font-semibold">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.sellingPrice)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleStockMovement(product.id, 'entrada', 1)}
                            className="p-1.5 bg-emerald-100 rounded-md text-emerald-700 hover:bg-emerald-200 transition-colors duration-200"
                            title="Agregar 1 unidad"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleStockMovement(product.id, 'salida', 1)}
                            className={`p-1.5 rounded-md transition-colors duration-200 ${product.stock < 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            title="Restar 1 unidad"
                            disabled={product.stock < 1}
                          >
                            -1
                          </button>
                          <Link
                            to={`/products/${product.id}`}
                            className="p-1.5 bg-indigo-100 rounded-md text-indigo-700 hover:bg-indigo-200 transition-colors duration-200 flex items-center"
                          >
                            <RiEditLine className="text-lg" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="p-1.5 bg-red-100 rounded-md text-red-700 hover:bg-red-200 transition-colors duration-200 flex items-center"
                          >
                            <RiDeleteBin6Line className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex justify-between items-center mt-8">
            <p className="text-sm text-gray-600 font-medium">
              Mostrando página {currentPage} de {totalPages}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 border rounded-lg flex items-center gap-1 transition-all duration-200 ${
                  currentPage === 1 
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' 
                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                }`}
              >
                <RiArrowLeftSLine className="text-lg" /> Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 border rounded-lg flex items-center gap-1 transition-all duration-200 ${
                  currentPage === totalPages 
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' 
                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                }`}
              >
                Siguiente <RiArrowRightSLine className="text-lg" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Inventory;
