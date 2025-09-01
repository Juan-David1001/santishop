import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Inventario</h1>
        <button
          onClick={() => setShowAddProduct(!showAddProduct)}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          {showAddProduct ? 'Cancelar' : 'Agregar Producto'}
        </button>
      </div>

      {/* Formulario para agregar producto */}
      {showAddProduct && (
        <div className="bg-white p-6 mb-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Agregar Nuevo Producto</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={newProduct.sku}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={newProduct.name}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1">Descripción</label>
              <textarea
                name="description"
                value={newProduct.description}
                onChange={handleProductFormChange}
                className="w-full border rounded p-2"
                rows="2"
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
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded"
              >
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 mb-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1">Nombre o SKU</label>
            <input
              type="text"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="w-full border rounded p-2"
              placeholder="Buscar por nombre o SKU"
            />
          </div>
          <div>
            <label className="block mb-1">Categoría</label>
            <select
              name="categoryId"
              value={filters.categoryId}
              onChange={handleFilterChange}
              className="w-full border rounded p-2"
            >
              <option value="">Todas las categorías</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="lowStock"
              name="lowStock"
              checked={filters.lowStock}
              onChange={handleFilterChange}
              className="mr-2"
            />
            <label htmlFor="lowStock">Mostrar solo productos con stock bajo</label>
          </div>
        </div>
      </div>

      {/* Tarjetas de valorización */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-blue-800 font-medium">Valor de Costo Total</h3>
          <p className="text-2xl font-bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.totalCostValue)}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-green-800 font-medium">Valor de Venta Total</h3>
          <p className="text-2xl font-bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.totalSellingValue)}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-purple-800 font-medium">Ganancia Potencial</h3>
          <p className="text-2xl font-bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.potentialProfit)}</p>
        </div>
        <div className="bg-amber-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-amber-800 font-medium">Margen de Ganancia</h3>
          <p className="text-2xl font-bold">{valuation.potentialProfitMargin.toFixed(2)}%</p>
        </div>
      </div>

      {/* Tabla de productos */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Costo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Venta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{product.name}</span>
                          {product.description && (
                            <span className="text-sm text-gray-500">{product.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{product.category.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`px-2 py-1 rounded ${
                            product.stock <= product.minimumStock
                              ? 'bg-red-100 text-red-800'
                              : product.stock <= product.minimumStock * 1.5
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stock}
                          </span>
                          {product.stock <= product.minimumStock && (
                            <span className="ml-2 text-red-500 text-xs">⚠️ Bajo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.costPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.sellingPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStockMovement(product.id, 'entrada', 1)}
                            className="text-green-600 hover:text-green-900"
                            title="Agregar 1 unidad"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleStockMovement(product.id, 'salida', 1)}
                            className="text-red-600 hover:text-red-900"
                            title="Restar 1 unidad"
                            disabled={product.stock < 1}
                          >
                            -1
                          </button>
                          <Link
                            to={`/products/${product.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
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

          {/* Paginación */}
          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-gray-700">
              Mostrando página {currentPage} de {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 border rounded ${
                  currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 border rounded ${
                  currentPage === totalPages 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Inventory;
