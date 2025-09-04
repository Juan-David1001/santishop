import { useState, useEffect } from 'react'
import apiClient from '../utils/apiClient'
import toast from 'react-hot-toast'
import { formatCurrency } from '../utils/formatters'
import { 
  FaSearch, FaShoppingCart, FaUser, FaTrash, FaMoneyBillWave, 
  FaCreditCard, FaExchangeAlt, FaPrint, FaCalendarAlt, FaSort, 
  FaFilter, FaEdit, FaChartLine, FaRegClock, FaBoxOpen
} from 'react-icons/fa'
import { MdPointOfSale, MdDiscount, MdPayment, MdReceiptLong, MdHistory, MdFilterList } from 'react-icons/md'

function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [saleDetails, setSaleDetails] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  
  // Estados para los filtros de búsqueda
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    paymentMethod: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [isFiltering, setIsFiltering] = useState(false)
 
  useEffect(() => {
    fetchSales()
    loadUsers()
  }, [])
  
  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      setUsers(response.data)
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }
  
  // Función para ver detalles de una venta
  const viewSaleDetails = async (saleId) => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/sales/${saleId}`)
      setSaleDetails(response.data)
      setShowDetailsModal(true)
    } catch (err) {
      console.error('Error cargando detalles de la venta:', err)
      toast.error('No se pudieron cargar los detalles de la venta')
    } finally {
      setLoading(false)
    }
  }
  
  // Función para cerrar modal de detalles
  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSaleDetails(null)
  }

  const [totals, setTotals] = useState({
    total: 0,
    byPaymentMethod: { efectivo: 0, transferencia: 0 }
  })
  
  // Estados para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0
  })
  
  // Función para cambiar de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      const updatedFilters = { ...filters, page: newPage }
      fetchSales(updatedFilters)
    }
  }

  const fetchSales = async (filterParams = {}) => {
    try {
      setLoading(true)
      
      // Verificar si hay filtros de fecha para habilitar la carga completa
      const hasDateFilter = filterParams.startDate || filterParams.endDate || 
                           (filters.startDate && !('startDate' in filterParams)) || 
                           (filters.endDate && !('endDate' in filterParams));
      
      // Si no hay página especificada, usar la página actual
      const paramsWithPagination = { 
        ...filterParams, 
        page: filterParams.page || pagination.page,
        limit: filterParams.limit || pagination.limit,
        // Si no se especifica explícitamente fullLoad pero hay filtros de fecha, activarlo
        fullLoad: filterParams.fullLoad !== undefined ? filterParams.fullLoad : 
                  (hasDateFilter ? 'true' : 'false')
      }
      
      // Construir URL con parámetros de filtro
      let url = '/sales'
      if (Object.keys(paramsWithPagination).length > 0) {
        const params = new URLSearchParams()
        Object.entries(paramsWithPagination).forEach(([key, value]) => {
          if (value !== '') {
            params.append(key, value)
          }
        })
        url = `/sales?${params.toString()}`
      }
      
      const response = await apiClient.get(url)
      
      // Actualizar estado con los datos recibidos
      if (response.data.sales) {
        // Nuevo formato de respuesta con ventas, totales y paginación
        console.log('Ventas recibidas:', response.data.sales)
        
        // Verificar si las ventas incluyen los datos de pagos
        const hasPayments = response.data.sales.some(sale => sale.payments && sale.payments.length > 0)
        console.log('¿Las ventas incluyen pagos?', hasPayments)
        
        setSales(response.data.sales)
        setTotals(response.data.totals || {
          total: 0,
          byPaymentMethod: { efectivo: 0, transferencia: 0 }
        })
        
        if (response.data.pagination) {
          setPagination(response.data.pagination)
        }
      } else {
        // Formato antiguo por compatibilidad
        setSales(response.data)
      }
      
      setError('')
    } catch (err) {
      setError('Error al cargar las ventas')
      console.error('Error fetching sales:', err)
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener el nombre del usuario que realizó la venta
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Usuario desconocido';
  }

  const handleDelete = async (id) => {
    if (confirm('¿Está seguro de que desea eliminar esta venta?')) {
      try {
        await apiClient.delete(`/sales/${id}`)
        fetchSales()
        toast.success('Venta eliminada correctamente', {
          icon: '🗑️'
        })
      } catch (err) {
        setError('Error al eliminar la venta')
        toast.error(err.response?.data?.error || 'Error al eliminar la venta')
        console.error('Error deleting sale:', err)
      }
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters({
      ...filters,
      [name]: value
    })
  }

  const applyFilters = (e) => {
    e.preventDefault()
    setIsFiltering(true)
    // Al aplicar filtros, volvemos a la primera página
    // Si hay filtros de fecha, indicamos que queremos carga completa
    const hasDateFilter = filters.startDate || filters.endDate;
    fetchSales({ ...filters, page: 1, fullLoad: hasDateFilter ? 'true' : 'false' })
  }

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      paymentMethod: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    setIsFiltering(false)
    // Al resetear filtros, volvemos a la primera página y desactivamos la carga completa
    fetchSales({ page: 1, fullLoad: 'false' })
  }

  const formatDate = (dateString) => {
    // Crear fecha a partir del string y ajustar a la zona horaria de Colombia (UTC-5)
    const date = new Date(dateString)
    
    // Usar opciones para formato colombiano y ajustar a hora local
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota'
    }).format(date)
  }
  
  // Función para formatear fecha con más detalle
  const formatDateDetail = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota'
    }).format(date);
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow-md border-l-4 border-fuchsia-500 hover:shadow-lg transition-all duration-300">
        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-2 rounded-lg shadow-inner">
          <MdPointOfSale size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historial de Ventas</h1>
          <p className="text-sm text-slate-500">Consulte el historial detallado de ventas y productos</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
      )}
      
      {/* Modal para detalles de venta */}
      {showDetailsModal && saleDetails && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 animate-fadeIn overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-t-xl flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-bold text-white flex items-center">
                <div className="p-2 bg-white/20 rounded-lg mr-3">
                  <MdReceiptLong size={20} className="text-white" />
                </div>
                Detalles de la Venta #{saleDetails.id}
              </h3>
              <button
                onClick={closeDetailsModal}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">Información de la venta</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Fecha:</span>
                      <span className="font-medium text-slate-800">{formatDateDetail(saleDetails.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Monto Total:</span>
                      <span className="font-bold text-fuchsia-600 text-lg">{formatCurrency(saleDetails.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-slate-600">Método de pago:</span>
                      <span className="font-medium text-slate-800 capitalize">
                        {saleDetails.paymentMethod || 'No especificado'}
                      </span>
                    </div>
                    {saleDetails.shift && (
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-slate-600">Turno:</span>
                        <span className="font-medium text-slate-800">#{saleDetails.shift.id}</span>
                      </div>
                    )}
                    {saleDetails.user && (
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-slate-600">Vendedor:</span>
                        <span className="font-medium text-slate-800">{saleDetails.user.name}</span>
                      </div>
                    )}
                    {saleDetails.client && (
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-slate-600">Cliente:</span>
                        <span className="font-medium text-slate-800">{saleDetails.client.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">Resumen de productos</h4>
                  <div className="space-y-3">
                    {saleDetails.saleItems ? (
                      <>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-600">Total de productos:</span>
                          <span className="font-medium text-slate-800">{saleDetails.saleItems.length}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-600">Cantidad total:</span>
                          <span className="font-medium text-slate-800">
                            {saleDetails.saleItems.reduce((total, item) => total + item.quantity, 0)} unidades
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2 text-slate-500">
                        No hay información de productos disponible
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tabla de productos */}
              <div className="mt-4">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                  <FaShoppingCart className="mr-2 text-violet-500" size={16} />
                  Productos en esta venta
                </h4>
                
                {saleDetails.saleItems && saleDetails.saleItems.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-700">Producto</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-700">Cantidad</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-700">Precio Unit.</th>
                          <th className="text-right py-3 px-4 text-xs font-semibold text-slate-700">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {saleDetails.saleItems.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg flex items-center justify-center mr-3">
                                  <span className="font-semibold text-xs text-fuchsia-600">{item.product?.sku || '#'}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800">{item.product?.name || 'Producto desconocido'}</p>
                                  {item.product?.category && (
                                    <p className="text-xs text-slate-500">{item.product.category.name}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-medium text-slate-800">{item.quantity}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-medium text-slate-800">{formatCurrency(item.unitPrice)}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-fuchsia-600">{formatCurrency(item.totalPrice)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-t border-slate-200">
                        <tr>
                          <td colSpan="3" className="py-3 px-4 text-right font-bold text-slate-800">TOTAL:</td>
                          <td className="py-3 px-4 text-right font-bold text-fuchsia-600 text-lg">{formatCurrency(saleDetails.amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                    <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="mt-2 text-slate-500">No hay productos registrados para esta venta</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeDetailsModal}
                  className="px-5 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 shadow-md"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de historial de ventas */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className="px-6 py-5 bg-gradient-to-r from-violet-700 to-fuchsia-800 flex justify-between items-center">
          <div className="flex items-center">
            <div className="p-2.5 rounded-lg bg-white/20 mr-3 shadow-inner">
              <MdReceiptLong className="text-white" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-white">Historial de Ventas</h3>
          </div>
          <span className="bg-gradient-to-r from-pink-400 to-fuchsia-500 text-xs font-semibold text-white px-4 py-1.5 rounded-full shadow-inner">
            {sales.length} {sales.length === 1 ? 'Venta' : 'Ventas'}
          </span>
        </div>
        
        {/* Resumen de totales */}
        <div className="bg-gradient-to-r from-slate-100 to-violet-50 px-6 py-6 border-b border-slate-200 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-between hover:shadow-lg transition-all transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-violet-100 to-fuchsia-200 rounded-xl mr-4 shadow-inner">
                  <FaChartLine className="text-fuchsia-600" size={18} />
                </div>
                <span className="text-base font-semibold text-slate-700">Total:</span>
              </div>
              <span className="text-lg font-bold text-fuchsia-700 bg-gradient-to-r from-fuchsia-50 to-white px-4 py-2 rounded-xl border border-fuchsia-200 shadow">
                {formatCurrency(totals.total)}
              </span>
            </div>
            
            <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-between hover:shadow-lg transition-all transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl mr-4 shadow-inner">
                  <FaMoneyBillWave className="text-emerald-600" size={18} />
                </div>
                <span className="text-base font-semibold text-slate-700">Efectivo:</span>
              </div>
              <span className="text-lg font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-white px-4 py-2 rounded-xl border border-emerald-200 shadow">
                {formatCurrency(totals.byPaymentMethod.efectivo)}
              </span>
            </div>
            
            <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-between hover:shadow-lg transition-all transform hover:-translate-y-1">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-violet-100 to-violet-200 rounded-xl mr-4 shadow-inner">
                  <FaExchangeAlt className="text-violet-600" size={18} />
                </div>
                <span className="text-base font-semibold text-slate-700">Transferencia:</span>
              </div>
              <span className="text-lg font-bold text-violet-700 bg-gradient-to-r from-violet-50 to-white px-4 py-2 rounded-xl border border-violet-200 shadow">
                {formatCurrency(totals.byPaymentMethod.transferencia)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Filtros de búsqueda */}
        <div className="border-b border-slate-200 p-6 bg-white">
          <div className="mb-5 flex justify-between items-center">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-xl mr-3 shadow-inner">
                <MdFilterList size={20} />
              </div>
              <h4 className="font-semibold text-slate-800 text-lg">Filtros de búsqueda</h4>
            </div>
            <button 
              onClick={resetFilters}
              className="text-sm text-fuchsia-600 hover:text-fuchsia-800 flex items-center px-4 py-2 hover:bg-fuchsia-50 rounded-lg transition-all shadow hover:shadow-md border border-fuchsia-100"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reiniciar filtros
            </button>
          </div>
          
          <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
              <label htmlFor="startDate" className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <FaCalendarAlt size={14} />
                </div>
                Fecha desde
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-md"
              />
            </div>
            
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
              <label htmlFor="endDate" className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <FaCalendarAlt size={14} />
                </div>
                Fecha hasta
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-md"
              />
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <label htmlFor="paymentMethodFilter" className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <FaCreditCard size={14} />
                </div>
                Método de pago
              </label>
              <div className="relative">
                <select
                  id="paymentMethodFilter"
                  name="paymentMethod"
                  value={filters.paymentMethod}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white shadow-md appearance-none"
                >
                  <option value="">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <label htmlFor="minAmount" className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <FaMoneyBillWave className="mr-2 text-indigo-500" size={14} />
                Monto mínimo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <input
                  type="number"
                  id="minAmount"
                  name="minAmount"
                  placeholder="0"
                  value={filters.minAmount}
                  onChange={handleFilterChange}
                  className="w-full pl-8 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus-ring bg-white shadow-sm"
                />
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <label htmlFor="maxAmount" className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <FaMoneyBillWave className="mr-2 text-indigo-500" size={14} />
                Monto máximo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <input
                  type="number"
                  id="maxAmount"
                  name="maxAmount"
                  placeholder="0"
                  value={filters.maxAmount}
                  onChange={handleFilterChange}
                  className="w-full pl-8 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus-ring bg-white shadow-sm"
                />
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <label htmlFor="sortBy" className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <FaSort className="mr-2 text-indigo-500" size={14} />
                Ordenar por
              </label>
              <div className="flex space-x-2">
                <select
                  id="sortBy"
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                  className="w-2/3 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus-ring bg-white shadow-sm appearance-none"
                >
                  <option value="createdAt">Fecha</option>
                  <option value="amount">Monto</option>
                </select>
                <select
                  id="sortOrder"
                  name="sortOrder"
                  value={filters.sortOrder}
                  onChange={handleFilterChange}
                  className="w-1/3 px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus-ring bg-white shadow-sm appearance-none"
                >
                  <option value="desc">↓ DESC</option>
                  <option value="asc">↑ ASC</option>
                </select>
              </div>
            </div>
            
            <div className="lg:col-span-3 flex justify-end mt-5">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-violet-600 hover:to-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transform hover:-translate-y-0.5 transition-all flex items-center"
              >
                <div className="bg-white/20 p-1.5 rounded-lg shadow-inner mr-2">
                  <FaFilter size={14} className="text-white" />
                </div>
                <span className="font-semibold">Aplicar Filtros</span>
              </button>
            </div>
          </form>
          
          {isFiltering && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-sm text-indigo-700 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {(filters.startDate || filters.endDate) ? 
                'Mostrando TODOS los resultados del período (sin paginación) para cálculo de totales' : 
                'Mostrando resultados filtrados'}
            </div>
          )}
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {sales.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="mt-2 text-gray-500">
                    {isFiltering 
                      ? 'No se encontraron ventas que coincidan con los filtros aplicados.'
                      : 'No hay ventas registradas.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full bg-white shadow-md">
                    <thead>
                      <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-200">
                        <th className="text-left py-4 px-5 font-semibold text-slate-700">Fecha</th>
                        <th className="text-left py-4 px-5 font-semibold text-slate-700">Método</th>
                        <th className="text-left py-4 px-5 font-semibold text-slate-700">Productos</th>
                        <th className="text-right py-4 px-5 font-semibold text-slate-700">Monto</th>
                        <th className="text-center py-4 px-5 font-semibold text-slate-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">{formatDate(sale.createdAt)}</span>
                              {sale.shift && sale.shift.user && (
                                <span className="text-xs text-slate-500 mt-1.5">
                                  {sale.shift.user.name}
                                </span>
                              )}
                              {sale.client && (
                                <span className="text-xs text-fuchsia-600 mt-1 flex items-center">
                                  <FaUser size={10} className="mr-1" />
                                  Cliente: {sale.client.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            {sale.payments && sale.payments.length > 0 ? (
                              <div className="space-y-2">
                                {sale.payments.map((payment, index) => (
                                  <span key={index} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shadow-sm ${
                                    payment.type === 'efectivo' ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200' :
                                    payment.type === 'transferencia' ? 'bg-gradient-to-r from-violet-50 to-violet-100 text-violet-800 border border-violet-200' :
                                    payment.type === 'tarjeta' ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200' :
                                    'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-800 border border-slate-200'
                                  }`}>
                                    {payment.type === 'efectivo' && <FaMoneyBillWave className="mr-1.5" size={12} />}
                                    {payment.type === 'transferencia' && <FaExchangeAlt className="mr-1.5" size={12} />}
                                    {payment.type === 'tarjeta' && <FaCreditCard className="mr-1.5" size={12} />}
                                    {payment.type === 'efectivo' ? 'Efectivo' :
                                     payment.type === 'transferencia' ? 'Transferencia' :
                                     payment.type === 'tarjeta' ? 'Tarjeta' : payment.type}
                                    {payment.amount && <span className="ml-1 font-semibold">{formatCurrency(payment.amount)}</span>}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200 shadow-sm">
                                <MdPayment className="mr-1.5" size={12} />
                                {sale.amount > 0 ? "Método no especificado" : "Sin pago"}
                              </span>
                            )}
                            {sale.shift && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-violet-50 to-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 shadow-sm">
                                  <FaRegClock className="mr-1.5" size={12} />
                                  Turno #{sale.shift.id}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            {sale.saleItems && sale.saleItems.length > 0 ? (
                              <div className="flex items-center">
                                <div className="p-2 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200 mr-2">
                                  <FaBoxOpen className="text-indigo-600" size={14} />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-slate-700">
                                    {sale.saleItems.length} producto{sale.saleItems.length !== 1 ? 's' : ''}
                                  </span>
                                  <div className="flex flex-wrap mt-1 gap-1">
                                    {sale.saleItems.slice(0, 2).map((item, idx) => (
                                      <span key={idx} className="inline-block px-2 py-0.5 bg-violet-50 text-xs rounded-md border border-violet-100 text-violet-700">
                                        {item.product?.name 
                                          ? (item.product.name.length > 10 ? item.product.name.substring(0, 10) + '...' : item.product.name)
                                          : 'Producto desconocido'
                                        }
                                      </span>
                                    ))}
                                    {sale.saleItems.length > 2 && (
                                      <span className="inline-block px-2 py-0.5 bg-fuchsia-50 text-xs rounded-md border border-fuchsia-100 text-fuchsia-700">
                                        +{sale.saleItems.length - 2} más
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500 italic">Sin productos</span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="inline-block font-medium text-fuchsia-600 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 py-1.5 rounded-lg border border-fuchsia-100 shadow-sm">
                              {formatCurrency(sale.amount)}
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex justify-center space-x-3">
                              <button
                                onClick={() => viewSaleDetails(sale.id)}
                                className="p-2 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg text-indigo-600 hover:shadow-md border border-indigo-200 transition-all transform hover:-translate-y-0.5"
                                title="Ver detalles"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(sale.id)}
                                className="p-2 bg-gradient-to-r from-fuchsia-50 to-pink-100 rounded-lg text-fuchsia-600 hover:shadow-md border border-fuchsia-200 transition-all transform hover:-translate-y-0.5"
                                title="Eliminar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Componente de paginación - solo mostrar si no estamos en carga completa */}
                  {pagination.totalPages > 1 && !pagination.isFullLoad && (
                    <div className="flex flex-col md:flex-row justify-between items-center mt-4 px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-t rounded-b-lg shadow-inner">
                      <div className="flex items-center text-sm text-slate-700 mb-2 md:mb-0">
                        <span className="mr-2">Mostrando <span className="font-medium text-fuchsia-700">{sales.length}</span> de <span className="font-medium text-fuchsia-700">{pagination.totalItems}</span></span>
                        <div className="flex items-center">
                          <span className="mr-1">Filas por página:</span>
                          <select 
                            value={pagination.limit}
                            onChange={(e) => {
                              const newLimit = parseInt(e.target.value);
                              fetchSales({ ...filters, page: 1, limit: newLimit });
                            }}
                            className="border border-violet-200 rounded-lg px-2 py-1 text-sm bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                          >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {/* Botón para primera página */}
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={pagination.page === 1}
                          className={`px-3 py-1 rounded-lg shadow-sm ${pagination.page === 1 
                            ? 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-violet-100 to-fuchsia-200 text-fuchsia-600 border border-fuchsia-200 hover:shadow-md transform hover:-translate-y-0.5 transition-all'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        {/* Botón página anterior */}
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className={`px-3 py-1 rounded-lg shadow-sm ${pagination.page === 1 
                            ? 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-violet-100 to-fuchsia-200 text-fuchsia-600 border border-fuchsia-200 hover:shadow-md transform hover:-translate-y-0.5 transition-all'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        {/* Números de página */}
                        {[...Array(pagination.totalPages).keys()].map(page => {
                          // Mostrar solo la página actual, la anterior, la siguiente, la primera y la última
                          const pageNumber = page + 1;
                          if (pageNumber === 1 || 
                              pageNumber === pagination.totalPages || 
                              pageNumber === pagination.page || 
                              pageNumber === pagination.page - 1 || 
                              pageNumber === pagination.page + 1) {
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => handlePageChange(pageNumber)}
                                className={`px-3 py-1 rounded-lg shadow-sm ${pagination.page === pageNumber 
                                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white border border-fuchsia-400' 
                                  : 'bg-gradient-to-r from-violet-50 to-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 hover:shadow-md transform hover:-translate-y-0.5 transition-all'}`}
                              >
                                {pageNumber}
                              </button>
                            )
                          }
                          // Mostrar puntos suspensivos si hay saltos
                          if (pageNumber === pagination.page - 2 || pageNumber === pagination.page + 2) {
                            return <span key={pageNumber} className="px-2 py-1 text-fuchsia-500">...</span>
                          }
                          return null;
                        })}
                        
                        {/* Botón página siguiente */}
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                          className={`px-3 py-1 rounded-lg shadow-sm ${pagination.page === pagination.totalPages 
                            ? 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-violet-100 to-fuchsia-200 text-fuchsia-600 border border-fuchsia-200 hover:shadow-md transform hover:-translate-y-0.5 transition-all'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        
                        {/* Botón para última página */}
                        <button
                          onClick={() => handlePageChange(pagination.totalPages)}
                          disabled={pagination.page === pagination.totalPages}
                          className={`px-3 py-1 rounded-lg shadow-sm ${pagination.page === pagination.totalPages 
                            ? 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-violet-100 to-fuchsia-200 text-fuchsia-600 border border-fuchsia-200 hover:shadow-md transform hover:-translate-y-0.5 transition-all'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sales;