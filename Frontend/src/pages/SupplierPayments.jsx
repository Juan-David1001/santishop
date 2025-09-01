import { useState, useEffect } from 'react'
import apiClient from '../utils/apiClient'
import toast from 'react-hot-toast'

function SupplierPayments() {
  const [payments, setPayments] = useState([])
  const [newPayment, setNewPayment] = useState({ 
    amount: '', 
    supplier: '', 
    description: '' 
  })
  const [editingPayment, setEditingPayment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeShifts, setActiveShifts] = useState([])
  const [selectedShift, setSelectedShift] = useState('')
  const [activeTab, setActiveTab] = useState('register') // 'register', 'history' o 'reports'
  
  // Estados para reportes
  const [debtReport, setDebtReport] = useState({
    active: [],
    paid: [],
    summary: { activeTotal: 0, paidTotal: 0 }
  })
  const [balanceReport, setBalanceReport] = useState({
    totalDebts: 0,
    totalInventory: 0,
    totalSales: 0,
    netBalance: 0
  })
  const [reportLoading, setReportLoading] = useState(false)
  
  // Estados para los filtros de búsqueda
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    supplier: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [isFiltering, setIsFiltering] = useState(false)
  
  // Estado para los totales
  const [totals, setTotals] = useState({
    total: 0
  })
  
  // Estados para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchPayments()
    loadActiveShifts()
  }, [])
  
  // Cargar reportes cuando se selecciona la pestaña de reportes
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchDebtReport()
      fetchBalanceReport()
    }
  }, [activeTab])
  
  // Efecto para seleccionar automáticamente el turno si solo hay uno disponible
  useEffect(() => {
    if (activeShifts.length === 1 && !selectedShift) {
      setSelectedShift(activeShifts[0].id)
    }
  }, [activeShifts])
  
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

  // Función para cambiar de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      const updatedFilters = { ...filters, page: newPage }
      fetchPayments(updatedFilters)
    }
  }

  const fetchPayments = async (filterParams = {}) => {
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
      let url = '/supplier-payments'
      if (Object.keys(paramsWithPagination).length > 0) {
        const params = new URLSearchParams()
        Object.entries(paramsWithPagination).forEach(([key, value]) => {
          if (value !== '') {
            params.append(key, value)
          }
        })
        url = `/supplier-payments?${params.toString()}`
      }
      
      const response = await apiClient.get(url)
      
      // Actualizar estado con los datos recibidos
      if (response.data.payments) {
        // Nuevo formato de respuesta con pagos, totales y paginación
        setPayments(response.data.payments)
        setTotals(response.data.totals)
        
        if (response.data.pagination) {
          setPagination(response.data.pagination)
        }
      } else {
        // Formato antiguo por compatibilidad
        setPayments(response.data)
      }
      
      setError('')
    } catch (err) {
      setError('Error al cargar los pagos')
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Verificar si hay turnos activos antes de registrar el pago
    if (!selectedShift && activeShifts.length > 0) {
      toast.error('Por favor seleccione un turno activo para registrar el pago')
      return
    }
    
    try {
      const paymentData = {
        ...newPayment,
        shiftId: selectedShift || (activeShifts.length === 1 ? activeShifts[0].id : null)
      }
      
      if (editingPayment) {
        await apiClient.put(`/supplier-payments/${editingPayment.id}`, paymentData)
        setEditingPayment(null)
        toast.success('¡Pago actualizado correctamente!', {
          icon: '✅'
        })
      } else {
        await apiClient.post('/supplier-payments', paymentData)
        toast.success('¡Pago registrado correctamente!', {
          icon: '💸'
        })
      }
      setNewPayment({ amount: '', supplier: '', description: '' })
      setSelectedShift('')
      fetchPayments()
    } catch (err) {
      setError('Error al guardar el pago')
      toast.error(err.response?.data?.error || 'Error al guardar el pago')
      console.error('Error saving payment:', err)
    }
  }

  const startEdit = (payment) => {
    setEditingPayment(payment)
    setNewPayment({
      amount: payment.amount,
      supplier: payment.supplier,
      description: payment.description || ''
    })
    if (payment.shiftId) {
      setSelectedShift(payment.shiftId)
    }
    setActiveTab('register') // Cambiar a la pestaña de registro para editar
  }

  const cancelEdit = () => {
    setEditingPayment(null)
    setNewPayment({ amount: '', supplier: '', description: '' })
    setSelectedShift('')
  }

  const handleDelete = async (id) => {
    if (confirm('¿Está seguro de que desea eliminar este pago?')) {
      try {
        await apiClient.delete(`/supplier-payments/${id}`)
        fetchPayments()
        toast.success('Pago eliminado correctamente', {
          icon: '🗑️'
        })
      } catch (err) {
        setError('Error al eliminar el pago')
        toast.error(err.response?.data?.error || 'Error al eliminar el pago')
        console.error('Error deleting payment:', err)
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
    fetchPayments({ ...filters, page: 1, fullLoad: hasDateFilter ? 'true' : 'false' })
  }

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      supplier: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    setIsFiltering(false)
    // Al resetear filtros, volvemos a la primera página y desactivamos la carga completa
    fetchPayments({ page: 1, fullLoad: 'false' })
  }
  
  // Función para obtener el reporte de deudas
  const fetchDebtReport = async () => {
    try {
      setReportLoading(true)
      const response = await apiClient.get('/supplier-payments/reports/debts')
      setDebtReport(response.data)
    } catch (err) {
      console.error('Error cargando reporte de deudas:', err)
      toast.error('Error al cargar el reporte de deudas')
    } finally {
      setReportLoading(false)
    }
  }
  
  // Función para obtener el reporte de balance general
  const fetchBalanceReport = async () => {
    try {
      setReportLoading(true)
      const response = await apiClient.get('/supplier-payments/reports/balance')
      setBalanceReport(response.data)
    } catch (err) {
      console.error('Error cargando balance general:', err)
      toast.error('Error al cargar el balance general')
    } finally {
      setReportLoading(false)
    }
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
      return `${baseClass} bg-indigo-600 text-white`
    }
    return `${baseClass} bg-gray-100 text-gray-600 hover:bg-gray-200`
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Pagos a Proveedores</h1>
      
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
      
      {/* Pestañas para cambiar entre registro, historial y reportes */}
      <div className="flex rounded-t-lg overflow-hidden mb-0 shadow-sm">
        <button 
          onClick={() => setActiveTab('register')}
          className={getTabClass('register')}
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Registrar Pago
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={getTabClass('history')}
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Historial de Pagos
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={getTabClass('reports')}
        >
          <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Reportes
        </button>
      </div>

      {/* Panel de registro de pagos */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-md overflow-hidden mb-8 hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700">
            <h3 className="text-lg font-medium text-white">
              {editingPayment ? 'Editar Pago' : 'Nuevo Pago a Proveedor'}
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="amount" className="block mb-2 font-medium text-gray-700">Monto</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      placeholder="0.00"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="supplier" className="block mb-2 font-medium text-gray-700">Proveedor</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="supplier"
                      placeholder="Nombre del proveedor"
                      value={newPayment.supplier}
                      onChange={(e) => setNewPayment({ ...newPayment, supplier: e.target.value })}
                      className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block mb-2 font-medium text-gray-700">Descripción</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="description"
                      placeholder="Descripción (opcional)"
                      value={newPayment.description}
                      onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                      className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                {activeShifts.length > 1 && (
                  <div className="md:col-span-3">
                    <label htmlFor="shiftSelect" className="block mb-2 font-medium text-gray-700">Turno</label>
                    <div className="relative">
                      <select
                        id="shiftSelect"
                        value={selectedShift}
                        onChange={(e) => setSelectedShift(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg appearance-none ${
                          activeShifts.length > 0 ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500' : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        }`}
                        required={activeShifts.length > 0}
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
                    </div>
                  </div>
                )}
                
                {/* Mostrar información del turno seleccionado automáticamente cuando solo hay uno */}
                {activeShifts.length === 1 && (
                  <div className="md:col-span-3">
                    <label className="block mb-2 font-medium text-gray-700">Turno</label>
                    <div className="px-4 py-3 border border-gray-300 bg-gray-50 rounded-lg text-gray-700 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {activeShifts[0].user ? `${activeShifts[0].user.name} (Turno #${activeShifts[0].id})` : `Turno #${activeShifts[0].id}`}
                    </div>
                  </div>
                )}
                
                {activeShifts.length === 0 && (
                  <div className="md:col-span-3">
                    <div className="w-full px-4 py-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-300">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">No hay turnos activos. Debe iniciar un turno antes de registrar pagos.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  <span className="flex items-center justify-center">
                    {!editingPayment ? (
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
                {editingPayment && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-3 ml-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
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
            </form>
          </div>
        </div>
      )}

      {/* Panel de historial y búsqueda */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-b-lg rounded-tl-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">Historial de Pagos a Proveedores</h3>
            <span className="bg-indigo-500 text-xs font-semibold text-white px-3 py-1 rounded-full">
              {payments.length} {payments.length === 1 ? 'Pago' : 'Pagos'}
            </span>
          </div>
          
          {/* Resumen de totales */}
          <div className="bg-indigo-50 px-6 py-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Total:</span>
                <span className="text-lg font-semibold text-indigo-700">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
          
          {/* Filtros de búsqueda */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="mb-2 flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-700">Filtros de búsqueda</h4>
              <button 
                onClick={resetFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="supplier" className="block mb-1 text-xs font-medium text-gray-700">Proveedor</label>
                <input
                  type="text"
                  id="supplier"
                  name="supplier"
                  placeholder="Nombre del proveedor"
                  value={filters.supplier}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="sortBy" className="block mb-1 text-xs font-medium text-gray-700">Ordenar por</label>
                <div className="flex space-x-2">
                  <select
                    id="sortBy"
                    name="sortBy"
                    value={filters.sortBy}
                    onChange={handleFilterChange}
                    className="w-2/3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="createdAt">Fecha</option>
                    <option value="amount">Monto</option>
                    <option value="supplier">Proveedor</option>
                  </select>
                  <select
                    id="sortOrder"
                    name="sortOrder"
                    value={filters.sortOrder}
                    onChange={handleFilterChange}
                    className="w-1/3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="desc">↓ DESC</option>
                    <option value="asc">↑ ASC</option>
                  </select>
                </div>
              </div>
              
              <div className="lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Aplicar Filtros
                </button>
              </div>
            </form>
            
            {isFiltering && (
              <div className="mt-2 p-2 bg-indigo-50 rounded-md text-xs text-indigo-800 flex items-center">
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                {payments.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2" />
                    </svg>
                    <p className="mt-2 text-gray-500">No hay pagos registrados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">Proveedor</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">Monto</th>
                          <th className="hidden md:table-cell text-left py-3 px-4 font-medium text-gray-600">Descripción</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span>{formatDate(payment.createdAt)}</span>
                                {payment.shift && payment.shift.user && (
                                  <span className="text-xs text-gray-500 mt-1">
                                    {payment.shift.user.name}
                                  </span>
                                )}
                                {payment.shift && (
                                  <span className="text-xs text-gray-400 mt-0.5">
                                    Turno #{payment.shift.id}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">{payment.supplier}</td>
                            <td className="py-3 px-4 text-right font-medium text-indigo-600">{formatCurrency(payment.amount)}</td>
                            <td className="hidden md:table-cell py-3 px-4 text-gray-500">{payment.description || '—'}</td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => startEdit(payment)}
                                  className="p-1.5 bg-blue-50 rounded-md text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                  title="Editar"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(payment.id)}
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
                          <span className="mr-2">Mostrando <span className="font-medium">{payments.length}</span> de <span className="font-medium">{pagination.totalItems}</span></span>
                          <div className="flex items-center">
                            <span className="mr-1">Filas por página:</span>
                            <select 
                              value={pagination.limit}
                              onChange={(e) => {
                                const newLimit = parseInt(e.target.value);
                                fetchPayments({ ...filters, page: 1, limit: newLimit });
                              }}
                              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                  className={`px-3 py-1 rounded ${pagination.page === pageNumber ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
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

      {/* Panel de reportes */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-md overflow-hidden mb-8 hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700">
            <h3 className="text-lg font-medium text-white">
              Reportes de Pagos a Proveedores
            </h3>
          </div>
          
          {reportLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <div className="p-6">
              {/* Reporte de deudas activas vs. pagadas */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Reporte de Deudas
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Deudas activas */}
                  <div className="bg-red-50 p-6 rounded-lg border border-red-100">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-md font-medium text-red-700">Deudas Activas</h5>
                      <span className="text-xl font-bold text-red-600">{formatCurrency(debtReport.summary.activeTotal)}</span>
                    </div>
                    
                    {debtReport.active.length === 0 ? (
                      <p className="text-sm text-center text-gray-500 py-4">No hay deudas activas</p>
                    ) : (
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="min-w-full">
                          <thead className="bg-red-100">
                            <tr>
                              <th className="text-left py-2 px-3 text-xs font-medium text-red-800">Proveedor</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-red-800">Monto</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-red-800">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-100">
                            {debtReport.active.map((debt, index) => (
                              <tr key={index} className="hover:bg-red-100/50">
                                <td className="py-2 px-3 text-sm font-medium">{debt.supplier}</td>
                                <td className="py-2 px-3 text-sm text-right">{formatCurrency(debt.amount)}</td>
                                <td className="py-2 px-3 text-sm text-gray-600">{formatDate(debt.date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {/* Deudas pagadas */}
                  <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-md font-medium text-green-700">Deudas Pagadas</h5>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(debtReport.summary.paidTotal)}</span>
                    </div>
                    
                    {debtReport.paid.length === 0 ? (
                      <p className="text-sm text-center text-gray-500 py-4">No hay deudas pagadas</p>
                    ) : (
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="min-w-full">
                          <thead className="bg-green-100">
                            <tr>
                              <th className="text-left py-2 px-3 text-xs font-medium text-green-800">Proveedor</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-green-800">Monto</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-green-800">Fecha Pago</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-green-100">
                            {debtReport.paid.map((debt, index) => (
                              <tr key={index} className="hover:bg-green-100/50">
                                <td className="py-2 px-3 text-sm font-medium">{debt.supplier}</td>
                                <td className="py-2 px-3 text-sm text-right">{formatCurrency(debt.amount)}</td>
                                <td className="py-2 px-3 text-sm text-gray-600">{formatDate(debt.paymentDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end mt-3">
                  <button
                    onClick={fetchDebtReport}
                    className="text-sm text-emerald-600 flex items-center hover:text-emerald-800"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualizar Reporte
                  </button>
                </div>
              </div>
              
              {/* Balance General */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Balance General
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                    <h5 className="text-sm font-medium text-blue-700 mb-2">Total Deudas</h5>
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xl font-bold text-blue-700">{formatCurrency(balanceReport.totalDebts)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 p-5 rounded-lg border border-amber-100">
                    <h5 className="text-sm font-medium text-amber-700 mb-2">Total Inventario</h5>
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="text-xl font-bold text-amber-700">{formatCurrency(balanceReport.totalInventory)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                    <h5 className="text-sm font-medium text-green-700 mb-2">Total Ventas</h5>
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2" />
                      </svg>
                      <span className="text-xl font-bold text-green-700">{formatCurrency(balanceReport.totalSales)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100">
                    <h5 className="text-sm font-medium text-indigo-700 mb-2">Balance Neto</h5>
                    <div className="flex items-center">
                      <svg className="w-8 h-8 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                      <span className={`text-xl font-bold ${balanceReport.netBalance >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                        {formatCurrency(balanceReport.netBalance)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={fetchBalanceReport}
                    className="text-sm text-emerald-600 flex items-center hover:text-emerald-800"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualizar Balance
                  </button>
                </div>
                
                {/* Notas explicativas */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h6 className="font-medium text-gray-700 mb-2">Notas sobre el Balance General:</h6>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>El <strong>Total Deudas</strong> representa la suma de todas las deudas pendientes con proveedores.</li>
                    <li>El <strong>Total Inventario</strong> refleja el valor actual del inventario disponible en stock.</li>
                    <li>El <strong>Total Ventas</strong> muestra la suma de todas las ventas realizadas.</li>
                    <li>El <strong>Balance Neto</strong> se calcula como: Total Ventas + Total Inventario - Total Deudas.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SupplierPayments
