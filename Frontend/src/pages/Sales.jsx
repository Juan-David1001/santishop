import { useState, useEffect } from 'react'
import apiClient from '../utils/apiClient'
import toast from 'react-hot-toast'

function Sales() {
  const [sales, setSales] = useState([])
  const [newSale, setNewSale] = useState({ 
    amount: '', 
    paymentMethod: 'efectivo',
    userId: ''
  })
  const [editingSale, setEditingSale] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [activeShifts, setActiveShifts] = useState([])
  const [selectedShift, setSelectedShift] = useState('')
  
  // Estados para los filtros de búsqueda
  const [activeTab, setActiveTab] = useState('register') // 'register' o 'history'
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
    loadActiveShifts()
  }, [])
  
  // Efecto para seleccionar automáticamente el turno si solo hay uno disponible
  useEffect(() => {
    if (activeShifts.length === 1 && !selectedShift) {
      setSelectedShift(activeShifts[0].id)
    }
  }, [activeShifts, selectedShift])
  
  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      setUsers(response.data)
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }
  
  const loadActiveShifts = async () => {
    try {
      // Intentar con el endpoint específico primero
      const response = await apiClient.get('/shifts/active')
      setActiveShifts(response.data)
    } catch (err) {
      console.error('Error loading active shifts:', err)
      // Intentar con el método alternativo si el primero falla
      try {
        const fallbackResponse = await apiClient.get('/shifts', { params: { active: true } })
        setActiveShifts(fallbackResponse.data)
      } catch (fallbackErr) {
        console.error('Error en segundo intento para cargar turnos:', fallbackErr)
        setActiveShifts([]) // Establecer un array vacío para no romper la UI
      }
    }
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
        setSales(response.data.sales)
        setTotals(response.data.totals)
        
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Verificar si hay turnos activos antes de registrar la venta
    if (activeShifts.length === 0) {
      toast.error('No hay turnos activos para registrar la venta')
      return
    }
    
    // Si hay un solo turno activo, usarlo automáticamente
    // Si hay múltiples turnos, verificar que se haya seleccionado uno
    if (activeShifts.length > 1 && !selectedShift) {
      toast.error('Por favor seleccione un turno activo para registrar la venta')
      return
    }
    
    const shiftToUse = activeShifts.length === 1 ? activeShifts[0].id : selectedShift;
    
    try {
      // Preparar los datos para enviar al servidor
      const saleData = {
        amount: newSale.amount,
        paymentMethod: newSale.paymentMethod,
        shiftId: shiftToUse
      }
      
      console.log("Datos a enviar:", saleData) // Para depuración
      
      if (editingSale) {
        // Asegurar que se envía el shiftId en la actualización
        const updateData = { 
          ...saleData,
          shiftId: shiftToUse // Aseguramos que se está enviando el shiftId para actualizaciones
        };
        await apiClient.put(`/sales/${editingSale.id}`, updateData);
        setEditingSale(null);
        toast.success('¡Venta actualizada correctamente!', {
          icon: '✅'
        });
      } else {
        const response = await apiClient.post('/sales', saleData);
        console.log('Respuesta al registrar venta:', response.data);
        toast.success('¡Venta registrada correctamente!', {
          icon: '💰'
        });
      }
      setNewSale({ 
        amount: '', 
        paymentMethod: 'efectivo',
        userId: ''
      })
      fetchSales()
    } catch (err) {
      setError('Error al guardar la venta')
      toast.error(err.response?.data?.error || 'Error al guardar la venta')
      console.error('Error saving sale:', err)
      console.error('Detalles completos:', err.response?.data) // Mostrar detalles completos del error
    }
  }

  const startEdit = (sale) => {
    setEditingSale(sale)
    setNewSale({ 
      amount: sale.amount,
      paymentMethod: sale.paymentMethod || 'efectivo',
      userId: sale.userId || ''
    })
    if (sale.shiftId) {
      setSelectedShift(sale.shiftId)
    }
    setActiveTab('register') // Cambiar a la pestaña de registro para editar
  }

  const cancelEdit = () => {
    setEditingSale(null)
    setNewSale({ amount: '', paymentMethod: 'efectivo', userId: '' })
    setSelectedShift('')
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
  
  // Función para formatear montos con separador de miles
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Función para obtener la clase de la pestaña activa/inactiva
  const getTabClass = (tabName) => {
    const baseClass = "flex-1 py-3 px-4 text-center font-medium"
    if (activeTab === tabName) {
      return `${baseClass} bg-blue-600 text-white`
    }
    return `${baseClass} bg-gray-100 text-gray-600 hover:bg-gray-200`
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Gestión de Ventas</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6 shadow-sm">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Pestañas para cambiar entre registro e historial */}
      <div className="flex rounded-t-lg overflow-hidden mb-0 shadow-sm">
        <button 
          onClick={() => setActiveTab('register')}
          className={getTabClass('register')}
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Registrar Venta
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={getTabClass('history')}
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Historial de Ventas
        </button>
      </div>

      {/* Panel de registro de ventas */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-md overflow-hidden mb-8 hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h3 className="text-lg font-medium text-white">
              {editingSale ? 'Editar Venta' : 'Nueva Venta'}
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label htmlFor="amount" className="block mb-2 font-medium text-gray-700">Monto</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      placeholder="0.00"
                      value={newSale.amount}
                      onChange={(e) => setNewSale({ ...newSale, amount: e.target.value })}
                      className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label htmlFor="paymentMethod" className="block mb-2 font-medium text-gray-700">Método de Pago</label>
                  <div className="relative">
                    <select
                      id="paymentMethod"
                      value={newSale.paymentMethod}
                      onChange={(e) => setNewSale({ ...newSale, paymentMethod: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {activeShifts.length > 0 && (
                  <div className="md:col-span-1">
                    <label htmlFor="shiftInfo" className="block mb-2 font-medium text-gray-700">Turno</label>
                    <div className="relative">
                      {activeShifts.length === 1 ? (
                        // Si solo hay un turno activo, mostrar info del turno en lugar del selector
                        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-blue-50 flex items-center">
                          <div className="flex items-center">
                            <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                            <span>
                              {activeShifts[0].user ? 
                                `${activeShifts[0].user.name} (Turno #${activeShifts[0].id})` : 
                                `Turno #${activeShifts[0].id}`}
                            </span>
                          </div>
                          {/* El turno se selecciona automáticamente con el useEffect a nivel de componente */}
                        </div>
                      ) : (
                        // Si hay múltiples turnos, mostrar selector
                        <>
                          <select
                            id="shiftSelect"
                            value={selectedShift}
                            onChange={(e) => setSelectedShift(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            required
                          >
                            <option value="" disabled>Seleccionar turno</option>
                            {activeShifts.map(shift => (
                              <option key={shift.id} value={shift.id}>
                                {shift.user ? `${shift.user.name} (Turno #${shift.id})` : `Turno #${shift.id}`}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {activeShifts.length === 0 && (
                  <div className="md:col-span-1">
                    <div className="flex h-full items-center">
                      <div className="w-full px-4 py-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-300">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm font-medium">No hay turnos activos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-end space-x-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <span className="flex items-center justify-center">
                      {!editingSale ? (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Agregar
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          Actualizar
                        </>
                      )}
                    </span>
                  </button>
                  {editingSale && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                    >
                      <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Panel de historial y búsqueda */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-b-lg rounded-tl-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Historial de Ventas</h3>
            <span className="bg-blue-500 text-xs font-semibold text-white px-3 py-1 rounded-full">
              {sales.length} {sales.length === 1 ? 'Venta' : 'Ventas'}
            </span>
          </div>
          
          {/* Resumen de totales */}
          <div className="bg-blue-50 px-6 py-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Total:</span>
                <span className="text-lg font-semibold text-blue-700">{formatCurrency(totals.total)}</span>
              </div>
              
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-600 mr-2">Efectivo:</span>
                  <span className="font-medium text-green-700">{formatCurrency(totals.byPaymentMethod.efectivo)}</span>
                </div>
                
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-600 mr-2">Transferencia:</span>
                  <span className="font-medium text-blue-700">{formatCurrency(totals.byPaymentMethod.transferencia)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Filtros de búsqueda */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="mb-2 flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-700">Filtros de búsqueda</h4>
              <button 
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reiniciar filtros
              </button>
            </div>
            
            <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="startDate" className="block mb-1 text-xs font-medium text-gray-700">Fecha desde</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block mb-1 text-xs font-medium text-gray-700">Fecha hasta</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="minAmount" className="block mb-1 text-xs font-medium text-gray-700">Monto mínimo</label>
                <input
                  type="number"
                  id="minAmount"
                  name="minAmount"
                  placeholder="Mínimo"
                  value={filters.minAmount}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="maxAmount" className="block mb-1 text-xs font-medium text-gray-700">Monto máximo</label>
                <input
                  type="number"
                  id="maxAmount"
                  name="maxAmount"
                  placeholder="Máximo"
                  value={filters.maxAmount}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="paymentMethodFilter" className="block mb-1 text-xs font-medium text-gray-700">Método de pago</label>
                <select
                  id="paymentMethodFilter"
                  name="paymentMethod"
                  value={filters.paymentMethod}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="sortBy" className="block mb-1 text-xs font-medium text-gray-700">Ordenar por</label>
                <div className="flex space-x-2">
                  <select
                    id="sortBy"
                    name="sortBy"
                    value={filters.sortBy}
                    onChange={handleFilterChange}
                    className="w-2/3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="createdAt">Fecha</option>
                    <option value="amount">Monto</option>
                  </select>
                  <select
                    id="sortOrder"
                    name="sortOrder"
                    value={filters.sortOrder}
                    onChange={handleFilterChange}
                    className="w-1/3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="desc">↓ DESC</option>
                    <option value="asc">↑ ASC</option>
                  </select>
                </div>
              </div>
              
              <div className="lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Aplicar Filtros
                </button>
              </div>
            </form>
            
            {isFiltering && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md text-xs text-blue-800 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Método</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">Monto</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span>{formatDate(sale.createdAt)}</span>
                                {sale.shift && sale.shift.user && (
                                  <span className="text-xs text-gray-500 mt-1">
                                    {sale.shift.user.name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {sale.paymentMethod === 'efectivo' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Efectivo
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Transferencia
                                </span>
                              )}
                              {sale.shift && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Turno #{sale.shift.id}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-blue-600">{formatCurrency(sale.amount)}</td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => startEdit(sale)}
                                  className="p-1.5 bg-blue-50 rounded-md text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                  title="Editar"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(sale.id)}
                                  className="p-1.5 bg-red-50 rounded-md text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
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
                      <div className="flex flex-col md:flex-row justify-between items-center mt-4 px-4 py-3 bg-gray-50 border-t rounded-b-lg">
                        <div className="flex items-center text-sm text-gray-700 mb-2 md:mb-0">
                          <span className="mr-2">Mostrando <span className="font-medium">{sales.length}</span> de <span className="font-medium">{pagination.totalItems}</span></span>
                          <div className="flex items-center">
                            <span className="mr-1">Filas por página:</span>
                            <select 
                              value={pagination.limit}
                              onChange={(e) => {
                                const newLimit = parseInt(e.target.value);
                                fetchSales({ ...filters, page: 1, limit: newLimit });
                              }}
                              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="10">10</option>
                              <option value="25">25</option>
                              <option value="50">50</option>
                              <option value="100">100</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {/* Botón para primera página */}
                          <button
                            onClick={() => handlePageChange(1)}
                            disabled={pagination.page === 1}
                            className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                          </button>
                          
                          {/* Botón página anterior */}
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className={`px-3 py-1 rounded ${pagination.page === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
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
                                  className={`px-3 py-1 rounded ${pagination.page === pageNumber ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                >
                                  {pageNumber}
                                </button>
                              )
                            }
                            // Mostrar puntos suspensivos si hay saltos
                            if (pageNumber === pagination.page - 2 || pageNumber === pagination.page + 2) {
                              return <span key={pageNumber} className="px-2 py-1">...</span>
                            }
                            return null;
                          })}
                          
                          {/* Botón página siguiente */}
                          <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className={`px-3 py-1 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          
                          {/* Botón para última página */}
                          <button
                            onClick={() => handlePageChange(pagination.totalPages)}
                            disabled={pagination.page === pagination.totalPages}
                            className={`px-3 py-1 rounded ${pagination.page === pagination.totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
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
      )}
    </div>
  );
}

export default Sales;
