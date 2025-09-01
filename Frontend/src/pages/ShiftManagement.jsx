import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import toast from 'react-hot-toast';

function ShiftManagement() {
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [closureData, setClosureData] = useState({
    shiftId: null,
    actualAmount: '',
    cashInRegister: '',
    transferAmount: '',
    notes: ''
  });
  const [showClosureForm, setShowClosureForm] = useState(false);

  useEffect(() => {
    loadUsers();
    loadShifts();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (err) {
      toast.error('Error al cargar los usuarios');
      console.error(err);
    }
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      // Primero cargamos todos los turnos
      const allShiftsRes = await apiClient.get('/shifts');
      setShifts(allShiftsRes.data);
      
      // Intentamos cargar los turnos activos
      try {
        // Intentar primero con el endpoint específico /shifts/active
        const activeShiftsRes = await apiClient.get('/shifts/active');
        setActiveShifts(activeShiftsRes.data);
        console.log('Turnos activos cargados (endpoint específico):', activeShiftsRes.data);
      } catch (activeErr) {
        // Si falla, intentar con el parámetro active=true
        try {
          const fallbackActiveRes = await apiClient.get('/shifts', { params: { active: true } });
          setActiveShifts(fallbackActiveRes.data);
          console.log('Turnos activos cargados (con parámetro):', fallbackActiveRes.data);
        } catch (fallbackErr) {
          console.error('Error en ambos métodos para cargar turnos activos:', fallbackErr);
          // Filtrar los turnos activos manualmente del array de todos los turnos
          const activeShifts = allShiftsRes.data.filter(shift => shift.isActive === true);
          setActiveShifts(activeShifts);
          console.log('Turnos activos filtrados manualmente:', activeShifts);
        }
      }
    } catch (err) {
      toast.error('Error al cargar los turnos');
      console.error('Error al cargar turnos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async () => {
    if (!selectedUser) {
      toast.error('Debes seleccionar un usuario');
      return;
    }

    try {
      await apiClient.post('/shifts/start', { userId: selectedUser });
      toast.success('Turno iniciado correctamente');
      loadShifts();
      setSelectedUser('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar turno');
      console.error(err);
    }
  };

  const handleEndShift = async (shiftId) => {
    try {
      await apiClient.post(`/shifts/${shiftId}/end`);
      toast.success('Turno finalizado correctamente');
      loadShifts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al finalizar turno');
      console.error(err);
    }
  };

  const handleClosureChange = (e) => {
    const { name, value } = e.target;
    setClosureData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const prepareForClosure = async (shiftId) => {
    try {
      // Obtener el total de ventas para este turno
      const response = await apiClient.get(`/shifts/${shiftId}/totals`);
      
      // Si la API devuelve los totales
      if (response.data && typeof response.data.total !== 'undefined') {
        setClosureData({
          shiftId,
          actualAmount: response.data.total.toString(), // Total esperado basado en las ventas
          cashInRegister: '',
          transferAmount: response.data.transferTotal ? response.data.transferTotal.toString() : '0',
          notes: ''
        });
      } else {
        // Si la API no devuelve totales, inicializar con valores vacíos
        setClosureData({
          shiftId,
          actualAmount: '',
          cashInRegister: '',
          transferAmount: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Error al obtener totales del turno:', err);
      
      // Método alternativo: obtener ventas filtradas por el turno y calcular manualmente
      try {
        // Intentar obtener todas las ventas y filtrar manualmente por el turno para mayor seguridad
        console.log('Intentando obtener ventas para el turno ID:', shiftId);
        
        const salesResponse = await apiClient.get('/sales', { 
          params: { 
            fullLoad: true, // Cargar todas las ventas
            shiftId: shiftId // Filtrar por el ID del turno
          } 
        });
        
        // Depurar la estructura de la respuesta
        console.log('Respuesta de ventas:', salesResponse.data);
        
        let total = 0;
        let transferTotal = 0;
        let salesProcessed = 0;
        
        const processSale = (sale) => {
          // Log para ver cada venta que se está procesando
          console.log('Procesando venta:', sale);
          
          // Convertir ambos a string para comparación segura
          const saleShiftId = String(sale.shiftId || '');
          const currentShiftId = String(shiftId || '');
          
          // Verificar si la venta pertenece al turno actual
          // SOLUCIÓN TEMPORAL: considerar ventas sin turno asignado (shiftId null o vacío) como pertenecientes al turno actual
          const belongsToShift = saleShiftId === currentShiftId || !sale.shiftId;
          console.log(`Venta ${sale.id || 'N/A'} - ShiftId: ${saleShiftId}, Turno actual: ${currentShiftId}, ¿Pertenece?: ${belongsToShift}`);
          
          if (belongsToShift) {
            const amount = parseFloat(sale.amount || 0);
            total += amount;
            if (sale.paymentMethod === 'transferencia') {
              transferTotal += amount;
            }
            salesProcessed++;
            console.log(`Venta ${sale.id} agregada al total. Monto: ${amount}, Método: ${sale.paymentMethod}`);
          }
        };
        
        // Procesar las ventas para obtener totales
        if (salesResponse.data && salesResponse.data.sales) {
          // Nuevo formato de respuesta
          console.log('Procesando nuevo formato de respuesta con salesResponse.data.sales');
          salesResponse.data.sales.forEach(processSale);
        } else if (salesResponse.data && Array.isArray(salesResponse.data)) {
          // Formato antiguo por compatibilidad
          console.log('Procesando formato antiguo de respuesta con array');
          salesResponse.data.forEach(processSale);
        } else {
          // Si la estructura no coincide con lo esperado
          console.log('Formato de respuesta no reconocido:', salesResponse.data);
        }
        
        console.log(`Procesadas ${salesProcessed} ventas para el turno ${shiftId}`);
        
        // Usar los totales calculados
        console.log('Totales calculados en primer intento:', { total, transferTotal });
        
        if (salesProcessed > 0) {
          setClosureData({
            shiftId,
            actualAmount: total ? total.toString() : '0',
            cashInRegister: '',
            transferAmount: transferTotal ? transferTotal.toString() : '0',
            notes: ''
          });
          
          toast.success('Totales calculados a partir de las ventas del turno');
          
          // Advertir al usuario que se están incluyendo ventas sin turno asignado
          toast.success('ATENCIÓN: Se incluyeron ventas sin turno asignado', {
            duration: 6000,
            icon: '⚠️'
          });
        } else {
          console.log('No se encontraron ventas para el turno en el primer intento');
          // En lugar de lanzar un error, continuamos con el flujo para probar el segundo método
          setClosureData({
            shiftId,
            actualAmount: '0',
            cashInRegister: '',
            transferAmount: '0',
            notes: ''
          });
        }
      } catch (fallbackErr) {
        console.error('Error en el primer método alternativo para calcular totales:', fallbackErr);
        
        // Segundo intento: obtener todas las ventas sin filtro y filtrar manualmente
        try {
          console.log('Segundo intento: obteniendo todas las ventas sin filtro');
          const allSalesResponse = await apiClient.get('/sales', { params: { fullLoad: true } });
          
          console.log('Todas las ventas obtenidas:', allSalesResponse.data);
          
          let total = 0;
          let transferTotal = 0;
          let salesProcessed = 0;
          
          const processSale = (sale) => {
            // Log para ver cada venta que se está procesando en el segundo intento
            console.log('Segundo intento - Procesando venta:', sale);
            
            // Convertir ambos a string para comparación segura
            const saleShiftId = String(sale.shiftId || '');
            const currentShiftId = String(shiftId || '');
            
            // Verificar si la venta pertenece al turno actual
            // SOLUCIÓN TEMPORAL: considerar ventas sin turno asignado (shiftId null o vacío) como pertenecientes al turno actual
            const belongsToShift = saleShiftId === currentShiftId || !sale.shiftId;
            console.log(`Segundo intento - Venta ${sale.id || 'N/A'} - ShiftId: ${saleShiftId}, Turno actual: ${currentShiftId}, ¿Pertenece?: ${belongsToShift}`);
            
            if (belongsToShift) {
              const amount = parseFloat(sale.amount || 0);
              total += amount;
              if (sale.paymentMethod === 'transferencia') {
                transferTotal += amount;
              }
              salesProcessed++;
              console.log(`Segundo intento - Venta ${sale.id} agregada al total. Monto: ${amount}, Método: ${sale.paymentMethod}`);
            }
          };
          
          // Procesar todas las ventas
          if (allSalesResponse.data && allSalesResponse.data.sales) {
            allSalesResponse.data.sales.forEach(processSale);
          } else if (allSalesResponse.data && Array.isArray(allSalesResponse.data)) {
            allSalesResponse.data.forEach(processSale);
          }
          
          console.log(`Segundo intento: procesadas ${salesProcessed} ventas para el turno ${shiftId}`);
          
          if (salesProcessed > 0) {
            // Usar los totales calculados
            console.log('Totales calculados en segundo intento:', { total, transferTotal });
            
            setClosureData({
              shiftId,
              actualAmount: total ? total.toString() : '0',
              cashInRegister: '',
              transferAmount: transferTotal ? transferTotal.toString() : '0',
              notes: 'NOTA: Se incluyeron ventas sin turno asignado. Por favor verifica los totales.'
            });
            
            toast.success('Totales calculados correctamente');
            
            // Advertir al usuario que se están incluyendo ventas sin turno asignado
            toast.success('ATENCIÓN: Se incluyeron ventas sin asignación específica de turno', {
              duration: 6000,
              icon: '⚠️'
            });
            return; // Salir de la función si se han calculado correctamente los totales
          } else {
            console.log('No se encontraron ventas para el turno en el segundo intento');
          }
        } catch (secondFallbackErr) {
          console.error('Error en el segundo método alternativo:', secondFallbackErr);
          
          // Tercer intento: intentar con un endpoint específico para el turno y sus ventas
          try {
            console.log('Tercer intento: obteniendo ventas directamente del turno');
            const shiftResponse = await apiClient.get(`/shifts/${shiftId}`);
            
            console.log('Datos del turno obtenidos:', shiftResponse.data);
            
            // Verificar si el turno tiene ventas asociadas directamente
            if (shiftResponse.data && shiftResponse.data.sales && Array.isArray(shiftResponse.data.sales)) {
              console.log(`Tercer intento: el turno tiene ${shiftResponse.data.sales.length} ventas asociadas`);
              
              let total = 0;
              let transferTotal = 0;
              
              shiftResponse.data.sales.forEach(sale => {
                const amount = parseFloat(sale.amount || 0);
                total += amount;
                if (sale.paymentMethod === 'transferencia') {
                  transferTotal += amount;
                }
              });
              
              console.log('Totales calculados en tercer intento:', { total, transferTotal });
              
              setClosureData({
                shiftId,
                actualAmount: total ? total.toString() : '0',
                cashInRegister: '',
                transferAmount: transferTotal ? transferTotal.toString() : '0',
                notes: ''
              });
              
              toast.success('Totales calculados a partir de las ventas del turno');
              return; // Salir de la función si se han calculado correctamente los totales
            } else {
              console.log('El turno no tiene ventas asociadas directamente');
            }
          } catch (thirdFallbackErr) {
            console.error('Error en el tercer método alternativo:', thirdFallbackErr);
            
            // Cuarto intento: intento más agresivo para encontrar ventas
            try {
              console.log('Cuarto intento: depuración completa de todas las ventas');
              
              // Obtener absolutamente todas las ventas sin filtros
              const allSalesResponse = await apiClient.get('/sales');
              
              console.log('Todas las ventas sin filtro:', allSalesResponse.data);
              
              // Imprimir información detallada de cada venta para depuración
              if (allSalesResponse.data) {
                const salesArray = Array.isArray(allSalesResponse.data) 
                  ? allSalesResponse.data 
                  : (allSalesResponse.data.sales || []);
                
                console.log(`Total de ventas en el sistema: ${salesArray.length}`);
                
                console.log('Lista de todas las ventas:');
                salesArray.forEach((sale, index) => {
                  console.log(`Venta #${index + 1}:`);
                  console.log('  ID:', sale.id);
                  console.log('  Monto:', sale.amount);
                  console.log('  Método de pago:', sale.paymentMethod);
                  console.log('  ShiftId:', sale.shiftId);
                  console.log('  Fecha de creación:', sale.createdAt);
                });
                
                // Contar ventas por turno
                const salesByShift = {};
                salesArray.forEach(sale => {
                  const shiftIdKey = String(sale.shiftId || 'sin_turno');
                  salesByShift[shiftIdKey] = (salesByShift[shiftIdKey] || 0) + 1;
                });
                
                console.log('Distribución de ventas por turno:', salesByShift);
              }
            } catch (finalError) {
              console.error('Error en el intento final de depuración:', finalError);
            }
          }
        }
        
        // Si todos los métodos fallan, inicializar con valores predeterminados
        setClosureData({
          shiftId,
          actualAmount: '0', // Usar 0 en lugar de vacío para mejor experiencia de usuario
          cashInRegister: '',
          transferAmount: '0',
          notes: 'No se encontraron ventas asociadas a este turno.'
        });
        toast.error('No se encontraron ventas para este turno', {
          duration: 4000
        });
      }
    }
    
    // Asegurándonos de que el formulario de cierre se muestre incluso si hubo errores
    setShowClosureForm(true);
    console.log('Modal de cierre de turno activada');
  };

  const handleCreateClosure = async (e) => {
    e.preventDefault();

    if (!closureData.shiftId || !closureData.actualAmount || !closureData.cashInRegister) {
      toast.error('Los montos son obligatorios');
      return;
    }

    try {
      toast.loading('Procesando cierre de caja y enviando reporte por correo...', { id: 'cierre-toast' });
      
      await apiClient.post(`/shifts/${closureData.shiftId}/closure`, {
        actualAmount: parseFloat(closureData.actualAmount),
        cashInRegister: parseFloat(closureData.cashInRegister),
        transferAmount: parseFloat(closureData.transferAmount || 0),
        notes: closureData.notes
      });

      toast.success('Cierre de caja registrado correctamente. Se ha enviado un reporte por correo electrónico.', {
        id: 'cierre-toast',
        duration: 5000
      });
      setShowClosureForm(false);
      loadShifts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cierre de caja');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">Cargando datos de turnos...</p>
      </div>
    );
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Gestión de Turnos</h2>

      {/* Iniciar Turno */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Iniciar Nuevo Turno</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-auto flex-grow">
            <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Usuario
            </label>
            <select
              id="user"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un usuario</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={handleStartShift}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md shadow-md transition-colors"
            >
              Iniciar Turno
            </button>
          </div>
        </div>
      </div>

      {/* Turnos Activos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-700">
          <h3 className="text-lg font-medium text-white">Turnos Activos</h3>
        </div>
        <div className="p-6">
          {activeShifts.length === 0 ? (
            <div className="text-center py-6">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-gray-500">No hay turnos activos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Usuario</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Inicio</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{shift.id}</td>
                      <td className="py-3 px-4">{shift.user?.name || 'Desconocido'}</td>
                      <td className="py-3 px-4">{formatDateTime(shift.startTime)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEndShift(shift.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1 px-3 rounded-md shadow-sm text-sm transition-colors"
                          >
                            Finalizar Turno
                          </button>
                          <button
                            onClick={() => prepareForClosure(shift.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-md shadow-sm text-sm transition-colors"
                          >
                            Cierre de Caja
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cierre de Caja */}
      {showClosureForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
              <h3 className="text-lg font-medium text-white">Registrar Cierre de Caja</h3>
            </div>
            <form onSubmit={handleCreateClosure} className="p-6">
              <div className="mb-4">
                <label htmlFor="actualAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Total Esperado (COP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="actualAmount"
                    name="actualAmount"
                    value={closureData.actualAmount}
                    onChange={handleClosureChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                    placeholder="0.00"
                    step="0.01"
                    required
                    readOnly
                  />
                  <div className="mt-1">
                    <span className="text-xs text-blue-600">Este es el total calculado de las ventas del turno</span>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="cashInRegister" className="block text-sm font-medium text-gray-700 mb-2">
                  Efectivo Real en Caja (COP)
                </label>
                <input
                  type="number"
                  id="cashInRegister"
                  name="cashInRegister"
                  value={closureData.cashInRegister}
                  onChange={handleClosureChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
                <div className="mt-1">
                  <span className="text-xs text-yellow-600">
                    Este es el monto REAL contado en caja. La diferencia se calculará automáticamente.
                  </span>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Transferencias Reportadas (COP)
                </label>
                <input
                  type="number"
                  id="transferAmount"
                  name="transferAmount"
                  value={closureData.transferAmount}
                  onChange={handleClosureChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
                <div className="mt-1">
                  <span className="text-xs text-blue-600">
                    Ingresa el monto total de transferencias recibidas. Este valor también se usará para calcular la diferencia total.
                  </span>
                </div>
              </div>
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={closureData.notes}
                  onChange={handleClosureChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observaciones adicionales..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowClosureForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-md transition-colors"
                >
                  Registrar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historial de Turnos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
          <h3 className="text-lg font-medium text-white">Historial de Turnos</h3>
        </div>
        <div className="p-6">
          {shifts.length === 0 ? (
            <div className="text-center py-6">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-gray-500">No hay turnos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Usuario</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Inicio</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fin</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Estado</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Cierre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{shift.id}</td>
                      <td className="py-3 px-4">{shift.user?.name || 'Desconocido'}</td>
                      <td className="py-3 px-4">{formatDateTime(shift.startTime)}</td>
                      <td className="py-3 px-4">{shift.endTime ? formatDateTime(shift.endTime) : '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${shift.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {shift.isActive ? 'Activo' : 'Finalizado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {shift.shiftClosure ? (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            Cerrado
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShiftManagement;
