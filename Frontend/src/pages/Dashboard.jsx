import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('day'); // 'day', 'week', 'month'
  const [salesData, setSalesData] = useState({
    day: { total: 0, byMethod: {}, hourly: [] },
    week: { total: 0, byMethod: {}, daily: [] },
    month: { total: 0, byMethod: {}, daily: [] }
  });
  const [paymentsData, setPaymentsData] = useState({
    day: { total: 0, bySupplier: {}, hourly: [] },
    week: { total: 0, bySupplier: {}, daily: [] },
    month: { total: 0, bySupplier: {}, daily: [] }
  });
  const [recentTransactions, setRecentTransactions] = useState({
    sales: [],
    payments: []
  });

  // Obtener fecha de hoy, inicio de semana y mes en formato ISO
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getWeekStartDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 es domingo, 1 es lunes, etc.
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajuste si es domingo
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const getMonthStartDate = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  };

  // Función para procesar los datos de ventas por hora (para datos diarios)
  const processHourlySales = (sales) => {
    const hourlyData = Array(24).fill(0);
    
    sales.forEach(sale => {
      const hour = new Date(sale.createdAt).getHours();
      hourlyData[hour] += parseFloat(sale.amount);
    });
    
    return hourlyData;
  };

  // Función para procesar los datos de ventas por día (para datos semanales y mensuales)
  const processDailySales = (sales, startDate, days) => {
    const dailyData = Array(days).fill(0);
    const start = new Date(startDate);
    
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const diffTime = Math.abs(date - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < days) {
        dailyData[diffDays] += parseFloat(sale.amount);
      }
    });
    
    return dailyData;
  };

  // Función para procesar los datos de pagos por proveedor
  const processPaymentsBySupplier = (payments) => {
    const suppliers = {};
    
    payments.forEach(payment => {
      const supplier = payment.supplier;
      if (!suppliers[supplier]) {
        suppliers[supplier] = 0;
      }
      suppliers[supplier] += parseFloat(payment.amount);
    });
    
    return suppliers;
  };

  // Cargar todos los datos necesarios
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fechas para filtrado
      const todayDate = getTodayDate();
      const weekStartDate = getWeekStartDate();
      const monthStartDate = getMonthStartDate();
      
      // Cargar datos del día actual
      const dailySalesRes = await apiClient.get('/sales', { 
        params: { startDate: todayDate, endDate: todayDate, fullLoad: true }
      });
      const dailyPaymentsRes = await apiClient.get('/supplier-payments', {
        params: { startDate: todayDate, endDate: todayDate, fullLoad: true }
      });
      
      // Cargar datos de la semana
      const weeklySalesRes = await apiClient.get('/sales', {
        params: { startDate: weekStartDate, endDate: todayDate, fullLoad: true }
      });
      const weeklyPaymentsRes = await apiClient.get('/supplier-payments', {
        params: { startDate: weekStartDate, endDate: todayDate, fullLoad: true }
      });
      
      // Cargar datos del mes
      const monthlySalesRes = await apiClient.get('/sales', {
        params: { startDate: monthStartDate, endDate: todayDate, fullLoad: true }
      });
      const monthlyPaymentsRes = await apiClient.get('/supplier-payments', {
        params: { startDate: monthStartDate, endDate: todayDate, fullLoad: true }
      });
      
      // Procesar datos de ventas
      setSalesData({
        day: {
          total: dailySalesRes.data.totals.total,
          byMethod: dailySalesRes.data.totals.byPaymentMethod,
          hourly: processHourlySales(dailySalesRes.data.sales)
        },
        week: {
          total: weeklySalesRes.data.totals.total,
          byMethod: weeklySalesRes.data.totals.byPaymentMethod,
          daily: processDailySales(weeklySalesRes.data.sales, weekStartDate, 7)
        },
        month: {
          total: monthlySalesRes.data.totals.total,
          byMethod: monthlySalesRes.data.totals.byPaymentMethod,
          daily: processDailySales(monthlySalesRes.data.sales, monthStartDate, 31)
        }
      });
      
      // Procesar datos de pagos
      setPaymentsData({
        day: {
          total: dailyPaymentsRes.data.totals.total,
          bySupplier: processPaymentsBySupplier(dailyPaymentsRes.data.payments),
          hourly: processHourlySales(dailyPaymentsRes.data.payments)
        },
        week: {
          total: weeklyPaymentsRes.data.totals.total,
          bySupplier: processPaymentsBySupplier(weeklyPaymentsRes.data.payments),
          daily: processDailySales(weeklyPaymentsRes.data.payments, weekStartDate, 7)
        },
        month: {
          total: monthlyPaymentsRes.data.totals.total,
          bySupplier: processPaymentsBySupplier(monthlyPaymentsRes.data.payments),
          daily: processDailySales(monthlyPaymentsRes.data.payments, monthStartDate, 31)
        }
      });
      
      // Obtener las transacciones más recientes
      setRecentTransactions({
        sales: dailySalesRes.data.sales
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5),
        payments: dailyPaymentsRes.data.payments
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      });
      
      setError('');
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError('Error al cargar los datos del dashboard');
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    
    // Actualizar datos cada 5 minutos
    const intervalId = setInterval(fetchAllData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchAllData]);

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'COP' 
    }).format(amount);
  };

  // Función para formatear fechas
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Configuración de las gráficas
  const salesLineChartConfig = {
    day: {
      labels: [...Array(24).keys()].map(hour => `${hour}:00`),
      datasets: [
        {
          label: 'Ventas',
          data: salesData.day.hourly,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3
        }
      ]
    },
    week: {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      datasets: [
        {
          label: 'Ventas',
          data: salesData.week.daily,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3
        }
      ]
    },
    month: {
      labels: [...Array(31).keys()].map(day => `${day + 1}`),
      datasets: [
        {
          label: 'Ventas',
          data: salesData.month.daily,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 3
        }
      ]
    }
  };

  const paymentsLineChartConfig = {
    day: {
      labels: [...Array(24).keys()].map(hour => `${hour}:00`),
      datasets: [
        {
          label: 'Pagos',
          data: paymentsData.day.hourly,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(239, 68, 68)',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3
        }
      ]
    },
    week: {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      datasets: [
        {
          label: 'Pagos',
          data: paymentsData.week.daily,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(239, 68, 68)',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3
        }
      ]
    },
    month: {
      labels: [...Array(31).keys()].map(day => `${day + 1}`),
      datasets: [
        {
          label: 'Pagos',
          data: paymentsData.month.daily,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(239, 68, 68)',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 3
        }
      ]
    }
  };

  const salesByMethodChartConfig = {
    labels: Object.keys(salesData[activeTab].byMethod).map(method => 
      method === 'efectivo' ? 'Efectivo' : 
      method === 'transferencia' ? 'Transferencia' : 
      method === 'tarjeta' ? 'Tarjeta' : 
      method === 'credito' ? 'Crédito' :
      method === 'cheque' ? 'Cheque' :
      method === 'otro' ? 'Otro' : method
    ),
    datasets: [
      {
        label: 'Método de Pago',
        data: Object.values(salesData[activeTab].byMethod),
        backgroundColor: [
          'rgba(59, 130, 246, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(249, 115, 22, 0.85)',
          'rgba(236, 72, 153, 0.85)',
          'rgba(107, 114, 128, 0.85)'
        ],
        borderColor: [
          'rgb(30, 64, 175)',
          'rgb(6, 95, 70)',
          'rgb(91, 33, 182)',
          'rgb(194, 65, 12)',
          'rgb(190, 24, 93)',
          'rgb(55, 65, 81)'
        ],
        borderWidth: 2,
        borderRadius: 4,
        hoverOffset: 15,
        hoverBorderWidth: 3,
        spacing: 4,
        weight: 1
      }
    ]
  };

  const paymentsBySupplierChartConfig = {
    labels: Object.keys(paymentsData[activeTab].bySupplier).slice(0, 5),
    datasets: [
      {
        label: 'Pagos por Proveedor',
        data: Object.values(paymentsData[activeTab].bySupplier).slice(0, 5),
        backgroundColor: [
          'rgba(239, 68, 68, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(139, 92, 246, 0.85)',
          'rgba(236, 72, 153, 0.85)',
          'rgba(75, 85, 99, 0.85)'
        ],
        borderColor: [
          'rgb(185, 28, 28)',
          'rgb(194, 120, 3)',
          'rgb(107, 33, 168)',
          'rgb(157, 23, 77)',
          'rgb(31, 41, 55)'
        ],
        borderWidth: 2,
        borderRadius: 8,
        hoverBorderWidth: 3,
        barThickness: 30,
        maxBarThickness: 40,
        borderSkipped: false,
        hoverBackgroundColor: [
          'rgba(239, 68, 68, 0.95)',
          'rgba(245, 158, 11, 0.95)',
          'rgba(139, 92, 246, 0.95)',
          'rgba(236, 72, 153, 0.95)',
          'rgba(75, 85, 99, 0.95)'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif'
          },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        bodyFont: {
          family: 'Inter, system-ui, sans-serif'
        },
        titleFont: {
          family: 'Inter, system-ui, sans-serif',
          weight: 'bold'
        },
        padding: 12,
        boxPadding: 6,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0
              }).format(context.parsed.y || context.parsed);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.15)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value) {
            return new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'COP',
              notation: 'compact',
              minimumFractionDigits: 0,
              maximumFractionDigits: 1
            }).format(value);
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 3,
      },
      point: {
        radius: 3,
        hoverRadius: 5
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  // Cambiar entre pestañas de día, semana y mes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // Obtener el título según la pestaña activa
  const getTabTitle = () => {
    switch (activeTab) {
      case 'day': return 'Hoy';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      default: return 'Hoy';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-300 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-200 to-gray-300">
                <div className="h-6 bg-gray-300 rounded w-48"></div>
              </div>
              <div className="p-6 animate-pulse" style={{ height: '300px' }}>
                <div className="flex items-center justify-center h-full">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Dashboard</h1>
      
      {/* Selector de periodos */}
      <div className="flex flex-wrap mb-6">
        <div className="w-full bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200">
            <button 
              onClick={() => handleTabChange('day')}
              className={`inline-block p-4 w-full md:w-auto transition-all duration-200 ${activeTab === 'day' 
                ? 'text-blue-600 bg-blue-50 font-semibold border-b-2 border-blue-600' 
                : 'hover:text-blue-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Hoy
              </div>
            </button>
            <button 
              onClick={() => handleTabChange('week')}
              className={`inline-block p-4 w-full md:w-auto transition-all duration-200 ${activeTab === 'week' 
                ? 'text-blue-600 bg-blue-50 font-semibold border-b-2 border-blue-600' 
                : 'hover:text-blue-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Esta Semana
              </div>
            </button>
            <button 
              onClick={() => handleTabChange('month')}
              className={`inline-block p-4 w-full md:w-auto transition-all duration-200 ${activeTab === 'month' 
                ? 'text-blue-600 bg-blue-50 font-semibold border-b-2 border-blue-600' 
                : 'hover:text-blue-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Este Mes
              </div>
            </button>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 md:mb-0">
                <span className="text-blue-600">{getTabTitle()}</span> - Resumen
              </h2>
              <p className="text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center">
                <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {activeTab === 'day' && `${new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}`}
                {activeTab === 'week' && `${new Date(getWeekStartDate()).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})} - ${new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}`}
                {activeTab === 'month' && `${new Date(getMonthStartDate()).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})} - ${new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}`}
              </p>
            </div>
          </div>
        </div>
      </div>

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

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Ventas */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-500 mb-1">Total Ventas</h3>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(salesData[activeTab].total)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Pagos */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-500 mb-1">Total Pagos</h3>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(paymentsData[activeTab].total)}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Balance */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-500 mb-1">Balance</h3>
              <p className={`text-3xl font-bold ${salesData[activeTab].total - paymentsData[activeTab].total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(salesData[activeTab].total - paymentsData[activeTab].total)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfica de ventas */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h3 className="text-lg font-medium text-white">Ventas por {activeTab === 'day' ? 'Hora' : 'Día'}</h3>
          </div>
          <div className="p-6" style={{ height: '300px' }}>
            <Line 
              data={salesLineChartConfig[activeTab]} 
              options={chartOptions} 
            />
          </div>
        </div>

        {/* Gráfica de pagos */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
            <h3 className="text-lg font-medium text-white">Pagos por {activeTab === 'day' ? 'Hora' : 'Día'}</h3>
          </div>
          <div className="p-6" style={{ height: '300px' }}>
            <Line 
              data={paymentsLineChartConfig[activeTab]} 
              options={chartOptions} 
            />
          </div>
        </div>
      </div>

      {/* Gráficas circulares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ventas por método de pago */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h3 className="text-lg font-medium text-white">Ventas por Método de Pago</h3>
          </div>
          <div className="p-6 flex justify-center" style={{ height: '300px' }}>
            {Object.keys(salesData[activeTab].byMethod).length > 0 ? (
              <Doughnut 
                data={salesByMethodChartConfig} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagos por proveedor */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
            <h3 className="text-lg font-medium text-white">Top 5 Pagos por Proveedor</h3>
          </div>
          <div className="p-6 flex justify-center" style={{ height: '300px' }}>
            {Object.keys(paymentsData[activeTab].bySupplier).length > 0 ? (
              <Bar 
                data={paymentsBySupplierChartConfig} 
                options={{
                  ...chartOptions,
                  indexAxis: 'y',
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: false
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transacciones recientes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Ventas recientes */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h3 className="text-lg font-medium text-white">Ventas Recientes</h3>
          </div>
          <div className="p-6">
            {recentTransactions.sales.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-gray-500">No hay ventas recientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Método</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentTransactions.sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDate(sale.createdAt)}</td>
                        <td className="py-3 px-4 capitalize">{sale.paymentMethod}</td>
                        <td className="py-3 px-4 text-right font-medium text-blue-600">{formatCurrency(sale.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pagos recientes */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
          <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700">
            <h3 className="text-lg font-medium text-white">Pagos Recientes a Proveedores</h3>
          </div>
          <div className="p-6">
            {recentTransactions.payments.length === 0 ? (
              <div className="text-center py-6">
                <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-gray-500">No hay pagos recientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Proveedor</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentTransactions.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDate(payment.createdAt)}</td>
                        <td className="py-3 px-4">{payment.supplier}</td>
                        <td className="py-3 px-4 text-right font-medium text-red-600">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botón para actualizar datos */}
      <div className="mt-8 mb-4 flex justify-end">
        <button 
          onClick={() => {
            toast.promise(
              fetchAllData(),
              {
                loading: 'Actualizando datos...',
                success: 'Datos actualizados correctamente',
                error: 'Error al actualizar los datos'
              }
            );
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-md flex items-center transition-all duration-300 hover:shadow-lg active:transform active:scale-95"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar datos
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
