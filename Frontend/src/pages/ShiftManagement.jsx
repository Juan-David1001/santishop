import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import toast from 'react-hot-toast';
import '../styles/ShiftManagement.css';

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
      toast.loading('Calculando totales para el cierre de caja...', { id: 'totals-toast' });
      
      // Usar el nuevo endpoint para obtener los totales del turno
      const response = await apiClient.get(`/shifts/${shiftId}/totals`);
      
      // Si la API devuelve los totales
      if (response.data && typeof response.data.total !== 'undefined') {
        console.log('Totales obtenidos del endpoint /shifts/:id/totals:', response.data);
        
        // Extraer los totales específicos para cada método de pago
        const { 
          total, 
          cashTotal, 
          transferTotal,
          cardTotal,
          pointsTotal,
          otherTotal
        } = response.data;
        
        // Establecer los datos para el cierre de caja
        setClosureData({
          shiftId,
          actualAmount: total.toString(), // Total esperado basado en todas las ventas
          cashInRegister: cashTotal ? cashTotal.toString() : '',
          transferAmount: transferTotal ? transferTotal.toString() : '0',
          notes: `Desglose de ventas: \nEfectivo: ${cashTotal || 0}\nTransferencias: ${transferTotal || 0}\nTarjeta: ${cardTotal || 0}\nPuntos: ${pointsTotal || 0}\nOtros: ${otherTotal || 0}`
        });
        
        toast.success('Totales calculados correctamente', {
          id: 'totals-toast',
          duration: 3000
        });
      } else {
        // Si la API no devuelve totales en el formato esperado
        console.error('El endpoint devolvió una respuesta sin la estructura esperada:', response.data);
        toast.error('Error al calcular los totales. Formato de respuesta inesperado.', { id: 'totals-toast' });
        
        // Inicializar con valores vacíos
        setClosureData({
          shiftId,
          actualAmount: '',
          cashInRegister: '',
          transferAmount: '',
          notes: 'Error al calcular los totales automáticamente. Por favor, revise los montos manualmente.'
        });
      }
    } catch (err) {
      console.error('Error al obtener totales del turno:', err);
      toast.error('Error al calcular los totales. Intentando método alternativo...', { id: 'totals-toast' });
      
      // Método alternativo: obtener ventas filtradas por el turno y calcular manualmente
      try {
        // Intentar obtener todas las ventas filtradas por el turno
        const salesResponse = await apiClient.get('/sales', { 
          params: { 
            fullLoad: true, // Cargar todas las ventas
            shiftId: shiftId // Filtrar por el ID del turno
          } 
        });
        
        console.log('Respuesta de ventas:', salesResponse.data);
        
        let totalEfectivo = 0;
        let totalTransferencia = 0;
        let totalTarjeta = 0;
        let totalPuntos = 0;
        let totalOtro = 0;
        let salesProcessed = 0;
        
        // Función para procesar cada venta y calcular totales por método de pago
        const processSale = (sale) => {
          // Verificar si la venta pertenece al turno actual
          if (sale.shiftId === parseInt(shiftId) || String(sale.shiftId) === String(shiftId)) {
            salesProcessed++;
            
            // Si la venta tiene pagos detallados, procesar cada uno
            if (sale.payments && sale.payments.length > 0) {
              sale.payments.forEach(payment => {
                const amount = parseFloat(payment.amount || 0);
                switch(payment.type) {
                  case 'efectivo':
                    totalEfectivo += amount;
                    break;
                  case 'transferencia':
                    totalTransferencia += amount;
                    break;
                  case 'tarjeta':
                    totalTarjeta += amount;
                    break;
                  case 'puntos':
                    totalPuntos += amount;
                    break;
                  default:
                    totalOtro += amount;
                }
              });
            } else {
              // Para ventas antiguas que no tienen payments detallados
              const amount = parseFloat(sale.amount || 0);
              switch(sale.paymentMethod) {
                case 'transferencia':
                  totalTransferencia += amount;
                  break;
                case 'tarjeta':
                  totalTarjeta += amount;
                  break;
                case 'puntos':
                  totalPuntos += amount;
                  break;
                case 'otro':
                  totalOtro += amount;
                  break;
                default:
                  // Por defecto asumimos efectivo
                  totalEfectivo += amount;
              }
            }
          }
        };
        
        // Procesar las ventas para obtener totales
        if (salesResponse.data && salesResponse.data.sales && Array.isArray(salesResponse.data.sales)) {
          salesResponse.data.sales.forEach(processSale);
        } else if (salesResponse.data && Array.isArray(salesResponse.data)) {
          salesResponse.data.forEach(processSale);
        }
        
        // Calcular el total general sumando todos los métodos de pago
        const totalGeneral = totalEfectivo + totalTransferencia + totalTarjeta + totalPuntos + totalOtro;
        
        console.log('Totales calculados manualmente:', { 
          totalGeneral, 
          totalEfectivo, 
          totalTransferencia,
          totalTarjeta,
          totalPuntos,
          totalOtro,
          salesProcessed
        });
        
        if (salesProcessed > 0) {
          // Usar los totales calculados
          setClosureData({
            shiftId,
            actualAmount: totalGeneral.toString(),
            cashInRegister: totalEfectivo.toString(),
            transferAmount: totalTransferencia.toString(),
            notes: `Cálculo manual - Ventas procesadas: ${salesProcessed}\nEfectivo: ${totalEfectivo}\nTransferencias: ${totalTransferencia}\nTarjeta: ${totalTarjeta}\nPuntos: ${totalPuntos}\nOtros: ${totalOtro}`
          });
          
          toast.success('Totales calculados correctamente', {
            id: 'totals-toast',
            duration: 3000
          });
        } else {
          // No se encontraron ventas asociadas a este turno
          setClosureData({
            shiftId,
            actualAmount: '0',
            cashInRegister: '',
            transferAmount: '0',
            notes: 'No se encontraron ventas asociadas a este turno.'
          });
          
          toast.error('No se encontraron ventas para este turno', {
            id: 'totals-toast',
            duration: 3000
          });
        }
      } catch (fallbackErr) {
        console.error('Error en el método alternativo para calcular totales:', fallbackErr);
        toast.error('Error al calcular los totales. Por favor, introduce los valores manualmente.', { id: 'totals-toast' });
        
        // Si todos los métodos fallan, inicializar con valores predeterminados
        setClosureData({
          shiftId,
          actualAmount: '0',
          cashInRegister: '',
          transferAmount: '0',
          notes: 'Error al calcular totales automáticamente. Por favor, introduce los valores manualmente.'
        });
      }
    }
    
    // Mostrar el formulario de cierre
    setShowClosureForm(true);
  };

  const handleCreateClosure = async (e) => {
    e.preventDefault();

    if (!closureData.shiftId || !closureData.actualAmount || !closureData.cashInRegister) {
      toast.error('Los montos son obligatorios');
      return;
    }

    try {
      toast.loading('Procesando cierre de caja y enviando reporte por correo...', { id: 'cierre-toast' });
      
      // Crear el cierre de caja
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
      
      // Finalizar automáticamente el turno
      try {
        await apiClient.post(`/shifts/${closureData.shiftId}/end`);
        toast.success('Turno finalizado automáticamente.', {
          duration: 3000
        });
      } catch (endShiftErr) {
        console.error('Error al finalizar turno automáticamente:', endShiftErr);
        toast.error('No se pudo finalizar el turno automáticamente. Por favor, finalícelo manualmente.');
      }
      
      setShowClosureForm(false);
      loadShifts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cierre de caja');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 bg-white rounded-xl shadow-md p-8 m-4 neomorphic-card animate-fadeIn">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-fuchsia-200 rounded-full glow-effect"></div>
          <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-fuchsia-600 border-l-fuchsia-600"></div>
        </div>
        <p className="mt-6 text-fuchsia-800 font-medium text-lg">Cargando datos de turnos...</p>
        <p className="text-sm text-slate-500 mt-2">Por favor espera mientras obtenemos la información</p>
      </div>
    );
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Turnos</h1>
            <p className="text-sm text-slate-500">Control de turnos de trabajo y cierre de caja</p>
          </div>
        </div>
        
        <button 
          onClick={loadShifts}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 btn-hover-effect spin-on-hover"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Iniciar Turno */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 neomorphic-card animate-fadeIn">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3 icon-pop">
            <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-800">Iniciar Nuevo Turno</h3>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-auto flex-grow">
            <label htmlFor="user" className="block text-sm font-medium text-slate-700 mb-2">
              Seleccionar Usuario para el Turno
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <select
                id="user"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200 appearance-none bg-white"
              >
                <option value="">Selecciona un usuario</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">El usuario seleccionado será responsable de este turno</p>
          </div>
          <div>
            <button
              onClick={handleStartShift}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center btn-hover-effect"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Iniciar Turno
            </button>
          </div>
        </div>
      </div>

      {/* Turnos Activos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 neomorphic-card">
        <div className="px-6 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 gradient-shift">
          <div className="flex items-center">
            <div className="p-2 bg-white/20 rounded-lg mr-3 icon-pop">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Turnos Activos</h3>
            <span className="ml-3 bg-white/20 text-white text-sm font-medium py-1 px-2 rounded-lg">
              {activeShifts.length} activos
            </span>
          </div>
        </div>
        <div className="p-6">
          {activeShifts.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-r from-slate-50 to-violet-50 rounded-xl animate-fadeIn">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner neomorphic-card">
                <svg className="w-12 h-12 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-slate-700 font-medium text-lg">No hay turnos activos</h3>
              <p className="mt-2 text-slate-500 max-w-sm mx-auto">Utiliza la sección superior para iniciar un nuevo turno</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50">
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">ID</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Usuario</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Inicio</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Duración</th>
                    <th className="text-right py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeShifts.map((shift) => {
                    const startTime = new Date(shift.startTime);
                    const now = new Date();
                    const diffMs = now - startTime;
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    const duration = `${diffHrs}h ${diffMins}m`;
                    
                    return (
                      <tr key={shift.id} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{shift.id}</td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex items-center">
                            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-full mr-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            {shift.user?.name || 'Desconocido'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-sm">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDateTime(shift.startTime)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-fuchsia-100 text-violet-800 rounded-full text-xs font-medium shadow-sm border border-violet-200">
                            <svg className="w-3 h-3 inline-block mr-1 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {duration}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEndShift(shift.id)}
                              className="flex items-center justify-center px-3 py-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors hover:shadow-md btn-hover-effect"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Finalizar
                            </button>
                            <button
                              onClick={() => prepareForClosure(shift.id)}
                              className="flex items-center justify-center px-3 py-1.5 text-fuchsia-600 bg-fuchsia-50 rounded-lg hover:bg-fuchsia-100 transition-colors hover:shadow-md btn-hover-effect"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                              Cierre de Caja
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cierre de Caja */}
      {showClosureForm && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn">
            <div className="px-6 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Registrar Cierre de Caja</h3>
              </div>
            </div>
            
            <form onSubmit={handleCreateClosure} className="p-6">
              <div className="mb-5">
                <label htmlFor="actualAmount" className="block text-sm font-medium text-slate-700 mb-2">
                  Monto Total Esperado (COP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="actualAmount"
                    name="actualAmount"
                    value={closureData.actualAmount}
                    onChange={handleClosureChange}
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 bg-violet-50"
                    placeholder="0.00"
                    step="0.01"
                    required
                    readOnly
                  />
                  <div className="mt-1.5 flex items-center">
                    <svg className="h-4 w-4 text-violet-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-violet-600">Este es el total calculado de las ventas del turno</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-5">
                <label htmlFor="cashInRegister" className="block text-sm font-medium text-slate-700 mb-2">
                  Efectivo Real en Caja (COP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="cashInRegister"
                    name="cashInRegister"
                    value={closureData.cashInRegister}
                    onChange={handleClosureChange}
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="mt-1.5 flex items-center">
                  <svg className="h-4 w-4 text-amber-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs text-amber-600">
                    Este es el monto REAL contado en caja. La diferencia se calculará automáticamente.
                  </span>
                </div>
              </div>
              
              <div className="mb-5">
                <label htmlFor="transferAmount" className="block text-sm font-medium text-slate-700 mb-2">
                  Transferencias Reportadas (COP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="transferAmount"
                    name="transferAmount"
                    value={closureData.transferAmount}
                    onChange={handleClosureChange}
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 bg-fuchsia-50"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="mt-1.5 flex items-center">
                  <svg className="h-4 w-4 text-fuchsia-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-fuchsia-600">
                    Monto total de transferencias recibidas durante este turno
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                  Notas Adicionales
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <textarea
                    id="notes"
                    name="notes"
                    value={closureData.notes}
                    onChange={handleClosureChange}
                    rows="3"
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200"
                    placeholder="Observaciones adicionales sobre el cierre..."
                  ></textarea>
                </div>
              </div>
              
              {/* Cálculo de diferencia */}
              {closureData.cashInRegister && (
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-violet-50 border border-slate-200 neomorphic-card">
                  <h4 className="font-medium text-slate-800 mb-2 flex items-center">
                    <svg className="w-4 h-4 text-violet-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Resumen de Cierre
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-2"></span>
                      Esperado:
                    </div>
                    <div className="font-medium text-right">${parseFloat(closureData.actualAmount || 0).toLocaleString('es-CO')}</div>
                    
                    <div className="text-slate-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-400 mr-2"></span>
                      En Caja:
                    </div>
                    <div className="font-medium text-right">${parseFloat(closureData.cashInRegister || 0).toLocaleString('es-CO')}</div>
                    
                    <div className="text-slate-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-2"></span>
                      Transferencias:
                    </div>
                    <div className="font-medium text-right">${parseFloat(closureData.transferAmount || 0).toLocaleString('es-CO')}</div>
                    
                    <div className="text-slate-700 font-medium pt-2 border-t flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                      Diferencia:
                    </div>
                    <div className={`font-bold text-right pt-2 border-t ${
                      parseFloat(closureData.cashInRegister) + parseFloat(closureData.transferAmount || 0) - parseFloat(closureData.actualAmount || 0) < 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      ${(parseFloat(closureData.cashInRegister) + parseFloat(closureData.transferAmount || 0) - parseFloat(closureData.actualAmount || 0)).toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowClosureForm(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all duration-200 btn-hover-effect"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center btn-hover-effect"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Registrar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historial de Turnos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden neomorphic-card">
        <div className="px-6 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 gradient-shift">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-3 icon-pop">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Historial de Turnos</h3>
            </div>
            <span className="bg-white/20 text-white text-sm font-medium py-1 px-3 rounded-lg">
              {shifts.length} registros
            </span>
          </div>
        </div>
        <div className="p-6">
          {shifts.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-r from-slate-50 to-fuchsia-50 rounded-xl animate-fadeIn">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner neomorphic-card">
                <svg className="w-12 h-12 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mt-4 text-slate-700 font-medium text-lg">No hay turnos registrados</h3>
              <p className="mt-2 text-slate-500 max-w-sm mx-auto">Una vez que inicies turnos, podrás ver su historial aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50">
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">ID</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Usuario</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Inicio</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Fin</th>
                    <th className="text-center py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Estado</th>
                    <th className="text-center py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Cierre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{shift.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center">
                          <div className="p-1 bg-violet-100 text-violet-600 rounded-full mr-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="text-slate-700">{shift.user?.name || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-sm">
                        <div className="flex items-center">
                          <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateTime(shift.startTime)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-sm">
                        {shift.endTime ? (
                          <div className="flex items-center">
                            <svg className="w-3.5 h-3.5 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDateTime(shift.endTime)}
                          </div>
                        ) : (
                          <span className="text-slate-400">En progreso</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {shift.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow-sm border border-green-200 glow-effect">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 shadow-sm border border-slate-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Finalizado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {shift.shiftClosure ? (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-fuchsia-100 text-fuchsia-800 shadow-sm border border-fuchsia-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Cerrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 shadow-sm border border-amber-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
