import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
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
  Legend,
  Filler
);

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sales'); // sales, products, stock, payments, balance
  const [period, setPeriod] = useState('week'); // day, week, month
  
  // Estados para reportes
  const [salesReport, setSalesReport] = useState({
    data: [],
    summary: { totalSales: 0, totalProfit: 0 }
  });
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState({ 
    outOfStock: [], critical: [], warning: [] 
  });
  const [paymentStatus, setPaymentStatus] = useState({
    pending: [], partiallyPaid: [], paid: []
  });
  const [generalBalance, setGeneralBalance] = useState({
    inventory: { value: 0 },
    sales: { totalSales: 0 },
    profit: { grossProfit: 0 },
    debt: { total: 0 }
  });

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesReport(period);
    } else if (activeTab === 'products') {
      fetchTopProducts();
    } else if (activeTab === 'stock') {
      fetchLowStockAlerts();
    } else if (activeTab === 'payments') {
      fetchPaymentStatus();
    } else if (activeTab === 'balance') {
      fetchGeneralBalance();
    }
  }, [activeTab, period]);

  // Función para obtener reportes de ventas
  const fetchSalesReport = async (selectedPeriod) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/sales', {
        params: { period: selectedPeriod }
      });
      setSalesReport(response.data);
      setError('');
    } catch (err) {
      console.error('Error cargando reporte de ventas:', err);
      setError('Error al cargar el reporte de ventas');
      toast.error('Error al cargar el reporte de ventas');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener productos más vendidos
  const fetchTopProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/top-products', {
        params: { limit: 10 }
      });
      setTopProducts(response.data.topProducts || []);
      setError('');
    } catch (err) {
      console.error('Error cargando productos top:', err);
      setError('Error al cargar los productos más vendidos');
      toast.error('Error al cargar los productos más vendidos');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener alertas de stock bajo
  const fetchLowStockAlerts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/low-stock');
      setLowStockAlerts(response.data.alerts || { outOfStock: [], critical: [], warning: [] });
      setError('');
    } catch (err) {
      console.error('Error cargando alertas de stock:', err);
      setError('Error al cargar las alertas de stock');
      toast.error('Error al cargar las alertas de stock');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener estado de pagos
  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/payment-status');
      setPaymentStatus(response.data.purchases || { pending: [], partiallyPaid: [], paid: [] });
      setError('');
    } catch (err) {
      console.error('Error cargando estado de pagos:', err);
      setError('Error al cargar el estado de pagos');
      toast.error('Error al cargar el estado de pagos');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener balance general
  const fetchGeneralBalance = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/general-balance');
      setGeneralBalance(response.data);
      setError('');
    } catch (err) {
      console.error('Error cargando balance general:', err);
      setError('Error al cargar el balance general');
      toast.error('Error al cargar el balance general');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Función para formatear porcentajes
  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  // Configuración para el gráfico de ventas
  const salesChartConfig = {
    labels: salesReport.data.map(item => item.period),
    datasets: [
      {
        label: 'Ventas',
        data: salesReport.data.map(item => item.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 2,
        tension: 0.4,
        fill: false
      },
      {
        label: 'Ganancias',
        data: salesReport.data.map(item => item.profit),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderWidth: 2,
        tension: 0.4,
        fill: false
      }
    ]
  };

  // Configuración para el gráfico de productos top
  const topProductsChartConfig = {
    labels: topProducts.map(product => product.name),
    datasets: [
      {
        label: 'Cantidad Vendida',
        data: topProducts.map(product => product.quantitySold),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(40, 159, 64, 0.7)',
          'rgba(210, 199, 199, 0.7)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Configuración para el gráfico de alertas de stock
  const stockAlertsChartConfig = {
    labels: ['Sin Stock', 'Crítico', 'Alerta'],
    datasets: [
      {
        data: [
          lowStockAlerts.outOfStock.length,
          lowStockAlerts.critical.length,
          lowStockAlerts.warning.length
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 205, 86, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Configuración para el gráfico de estado de pagos
  const paymentStatusChartConfig = {
    labels: ['Pendiente', 'Parcial', 'Pagado'],
    datasets: [
      {
        data: [
          paymentStatus.pending.length,
          paymentStatus.partiallyPaid.length,
          paymentStatus.paid.length
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)'
        ],
        borderWidth: 1,
        hoverOffset: 4
      }
    ]
  };

  // Configuración para el gráfico del balance general
  const balanceChartConfig = {
    labels: ['Ventas', 'Valor Inventario', 'Deuda'],
    datasets: [
      {
        data: [
          generalBalance.sales?.totalSales || 0,
          generalBalance.inventory?.value || 0,
          generalBalance.debt?.total || 0
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)',
          'rgb(255, 99, 132)'
        ],
        borderWidth: 1
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
            size: 12
          },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        bodyFont: {
          size: 13
        },
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== undefined) {
              // Para gráficos de ventas y balance que usan moneda
              if (activeTab === 'sales' || activeTab === 'balance') {
                label += formatCurrency(context.parsed.y || context.parsed);
              } else {
                label += context.parsed.y || context.parsed;
              }
            }
            return label;
          }
        }
      }
    },
    scales: activeTab === 'sales' ? {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    } : undefined
  };

  const periodOptions = [
    { value: 'day', label: 'Día' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Reportes</h1>

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

      {/* Pestañas de navegación */}
      <div className="mb-6">
        <div className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 bg-white rounded-t-lg overflow-hidden">
          <button
            onClick={() => setActiveTab('sales')}
            className={`inline-block p-4 w-full sm:w-auto ${activeTab === 'sales' 
              ? 'text-blue-600 bg-gray-50 border-b-2 border-blue-600' 
              : 'hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ventas
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`inline-block p-4 w-full sm:w-auto ${activeTab === 'products' 
              ? 'text-blue-600 bg-gray-50 border-b-2 border-blue-600' 
              : 'hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Productos
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`inline-block p-4 w-full sm:w-auto ${activeTab === 'stock' 
              ? 'text-blue-600 bg-gray-50 border-b-2 border-blue-600' 
              : 'hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Stock
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`inline-block p-4 w-full sm:w-auto ${activeTab === 'payments' 
              ? 'text-blue-600 bg-gray-50 border-b-2 border-blue-600' 
              : 'hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Pagos
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`inline-block p-4 w-full sm:w-auto ${activeTab === 'balance' 
              ? 'text-blue-600 bg-gray-50 border-b-2 border-blue-600' 
              : 'hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Balance
          </button>
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      {loading ? (
        <div className="flex justify-center items-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Pestaña de Ventas */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Selector de período */}
              <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
                <label className="text-gray-700 font-medium">Período:</label>
                <div className="inline-flex rounded-md shadow-sm">
                  {periodOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPeriod(option.value)}
                      className={`px-4 py-2 text-sm font-medium ${
                        period === option.value 
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } ${
                        option.value === 'day'
                          ? 'rounded-l-md'
                          : option.value === 'month'
                            ? 'rounded-r-md'
                            : ''
                      } border border-gray-300`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Total Ventas</h3>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(salesReport.summary.totalSales)}</p>
                  <p className="text-sm text-gray-500 mt-2">{salesReport.data.length} ventas en el período</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Total Ganancias</h3>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(salesReport.summary.totalProfit)}</p>
                  <p className="text-sm text-gray-500 mt-2">Margen: {formatPercent(salesReport.summary.profitMargin)}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Promedio por {period === 'day' ? 'Día' : period === 'week' ? 'Semana' : 'Mes'}</h3>
                  <p className="text-3xl font-bold text-purple-600">{formatCurrency(salesReport.summary.averageSalesPerPeriod)}</p>
                  <p className="text-sm text-gray-500 mt-2">{salesReport.data.length} períodos analizados</p>
                </div>
              </div>

              {/* Gráfico de ventas */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                  <h3 className="text-lg font-medium text-white">Ventas y Ganancias por {period === 'day' ? 'Día' : period === 'week' ? 'Semana' : 'Mes'}</h3>
                </div>
                <div className="p-6" style={{ height: '400px' }}>
                  {salesReport.data.length > 0 ? (
                    <Line data={salesChartConfig} options={chartOptions} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      <p className="mt-4 text-gray-500">No hay datos de ventas para mostrar en este período</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Productos */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                  <h3 className="text-lg font-medium text-white">Productos Más Vendidos</h3>
                </div>
                <div className="p-6" style={{ height: '400px' }}>
                  {topProducts.length > 0 ? (
                    <Bar data={topProductsChartConfig} options={{
                      ...chartOptions,
                      indexAxis: 'y',
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          display: false
                        }
                      }
                    }} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="mt-4 text-gray-500">No hay datos de productos para mostrar</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista detallada de productos top */}
              {topProducts.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Detalle de Productos Más Vendidos</h3>
                  </div>
                  <div className="p-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {topProducts.map((product, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{product.quantitySold}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{formatCurrency(product.totalSales)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <span className="text-green-600 font-medium">{formatCurrency(product.profit)}</span>
                              <span className="text-gray-500 ml-2">({formatPercent(product.profitMargin)})</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                product.currentStock === 0 
                                  ? 'bg-red-100 text-red-800' 
                                  : product.currentStock <= 5
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                              }`}>
                                {product.currentStock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pestaña de Stock */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Sin Stock</h3>
                  <p className="text-3xl font-bold text-red-600">{lowStockAlerts.outOfStock.length}</p>
                  <p className="text-sm text-gray-500 mt-2">Productos agotados</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Stock Crítico</h3>
                  <p className="text-3xl font-bold text-yellow-600">{lowStockAlerts.critical.length}</p>
                  <p className="text-sm text-gray-500 mt-2">Requiere atención urgente</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Alerta de Stock</h3>
                  <p className="text-3xl font-bold text-orange-600">{lowStockAlerts.warning.length}</p>
                  <p className="text-sm text-gray-500 mt-2">Stock bajo mínimo</p>
                </div>
              </div>

              {/* Gráfico de estado del stock */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Distribución de Alertas</h3>
                  </div>
                  <div className="p-6" style={{ height: '300px' }}>
                    <Pie data={stockAlertsChartConfig} options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'right'
                        }
                      }
                    }} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Productos Sin Stock</h3>
                  </div>
                  <div className="p-6 overflow-y-auto" style={{ maxHeight: '300px' }}>
                    {lowStockAlerts.outOfStock.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {lowStockAlerts.outOfStock.map((product, index) => (
                          <li key={index} className="py-3">
                            <div className="flex justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                <p className="text-sm text-gray-500">{product.category} - SKU: {product.sku}</p>
                              </div>
                              <div className="text-right">
                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                  Agotado
                                </span>
                                {product.recentSales > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {product.recentSales} vendidos (30d)
                                  </p>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center py-10 text-gray-500">No hay productos sin stock</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de productos con stock crítico */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-yellow-600 to-yellow-800">
                  <h3 className="text-lg font-medium text-white">Productos con Stock Crítico</h3>
                </div>
                <div className="p-6 overflow-x-auto">
                  {lowStockAlerts.critical.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas Recientes</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Días Restantes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lowStockAlerts.critical.map((product, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                {product.currentStock}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{product.minimumStock}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{product.recentSales}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {product.daysRemaining !== null ? (
                                <span className={`text-sm font-medium ${
                                  product.daysRemaining <= 3 
                                    ? 'text-red-600' 
                                    : product.daysRemaining <= 7
                                      ? 'text-yellow-600'
                                      : 'text-gray-900'
                                }`}>
                                  {product.daysRemaining} días
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center py-10 text-gray-500">No hay productos en estado crítico</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Pagos */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Estado de Pagos a Proveedores</h3>
                  </div>
                  <div className="p-6" style={{ height: '300px' }}>
                    <Doughnut data={paymentStatusChartConfig} options={{
                      ...chartOptions,
                      cutout: '60%',
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Resumen de Pagos</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Facturas Pendientes</h4>
                        <p className="text-2xl font-bold text-red-600">
                          {paymentStatus.pending.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatCurrency(paymentStatus.pending.reduce((sum, p) => sum + p.dueAmount, 0))}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Pagos Parciales</h4>
                        <p className="text-2xl font-bold text-yellow-600">
                          {paymentStatus.partiallyPaid.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatCurrency(paymentStatus.partiallyPaid.reduce((sum, p) => sum + p.dueAmount, 0))}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Facturas Pagadas</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {paymentStatus.paid.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatCurrency(paymentStatus.paid.reduce((sum, p) => sum + p.totalAmount, 0))}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Total Adeudado</h4>
                        <p className="text-2xl font-bold text-indigo-600">
                          {formatCurrency([
                            ...paymentStatus.pending,
                            ...paymentStatus.partiallyPaid
                          ].reduce((sum, p) => sum + p.dueAmount, 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagos pendientes */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-800">
                  <h3 className="text-lg font-medium text-white">Pagos Pendientes</h3>
                </div>
                <div className="p-6 overflow-x-auto">
                  {paymentStatus.pending.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Compra</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Vencimiento</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentStatus.pending.map((payment, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{payment.supplier}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{payment.invoiceNumber || `#${payment.id}`}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                              {new Date(payment.purchaseDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {payment.dueDate ? (
                                <span className={`text-sm ${
                                  new Date(payment.dueDate) < new Date() 
                                    ? 'text-red-600 font-medium' 
                                    : 'text-gray-500'
                                }`}>
                                  {new Date(payment.dueDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatCurrency(payment.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                              {formatCurrency(payment.dueAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center py-10 text-gray-500">No hay pagos pendientes</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Balance */}
          {activeTab === 'balance' && (
            <div className="space-y-6">
              {/* Tarjetas de balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Ventas Acumuladas</h3>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(generalBalance.sales?.totalSales || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">Total histórico de ventas</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Valor Inventario</h3>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(generalBalance.inventory?.value || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">Valor actual en stock</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Ganancia Acumulada</h3>
                  <p className="text-3xl font-bold text-indigo-600">{formatCurrency(generalBalance.profit?.grossProfit || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Margen: {formatPercent(generalBalance.profit?.profitMargin || 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Deuda a Proveedores</h3>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(generalBalance.debt?.total || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">Total pendiente por pagar</p>
                </div>
              </div>

              {/* Gráficos de balance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Balance General</h3>
                  </div>
                  <div className="p-6" style={{ height: '300px' }}>
                    <Pie data={balanceChartConfig} options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'right'
                        }
                      }
                    }} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Resumen Financiero</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="text-base font-medium text-gray-700 mb-2">Patrimonio Neto</h4>
                      <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div 
                          className="bg-green-500 h-6" 
                          style={{ 
                            width: `${Math.min(
                              ((generalBalance.sales?.totalSales || 0) + (generalBalance.inventory?.value || 0)) / 
                              ((generalBalance.sales?.totalSales || 0) + (generalBalance.inventory?.value || 0) + (generalBalance.debt?.total || 0)) * 100, 
                              100
                            )}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-gray-600">Activos: {formatCurrency((generalBalance.sales?.totalSales || 0) + (generalBalance.inventory?.value || 0))}</span>
                        <span className="text-sm text-gray-600">Pasivos: {formatCurrency(generalBalance.debt?.total || 0)}</span>
                      </div>
                    </div>
                    
                    <dl className="mt-6 space-y-4">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Valor de inventario al costo</dt>
                        <dd className="text-sm font-medium text-gray-900">{formatCurrency(generalBalance.inventory?.value || 0)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Valor de inventario al precio de venta</dt>
                        <dd className="text-sm font-medium text-gray-900">{formatCurrency(generalBalance.inventory?.retailValue || 0)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Ganancia potencial en inventario</dt>
                        <dd className="text-sm font-medium text-green-600">{formatCurrency(generalBalance.inventory?.potentialProfit || 0)}</dd>
                      </div>
                      <div className="pt-4 mt-4 border-t border-gray-200">
                        <div className="flex justify-between">
                          <dt className="text-base font-medium text-gray-900">Balance Neto</dt>
                          <dd className="text-base font-medium text-blue-600">
                            {formatCurrency((generalBalance.summary?.netWorth || 0))}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Botón de actualización */}
      <div className="mt-6 flex justify-end">
        <button 
          onClick={() => {
            if (activeTab === 'sales') {
              fetchSalesReport(period);
            } else if (activeTab === 'products') {
              fetchTopProducts();
            } else if (activeTab === 'stock') {
              fetchLowStockAlerts();
            } else if (activeTab === 'payments') {
              fetchPaymentStatus();
            } else if (activeTab === 'balance') {
              fetchGeneralBalance();
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow flex items-center transition-colors"
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

export default Reports;
