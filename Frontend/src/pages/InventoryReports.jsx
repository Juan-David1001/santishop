import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function InventoryReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reportType, setReportType] = useState('inventory-valuation');
  const [timeRange, setTimeRange] = useState('month'); // month, quarter, year
  const [reportData, setReportData] = useState({});
  const [lowStockProducts, setLowStockProducts] = useState([]);
  
  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const categoriesResponse = await apiClient.get('/categories');
        setCategories(categoriesResponse.data);
        
        // Cargar el reporte inicial
        loadReport(reportType, timeRange);
      } catch (err) {
        setError('Error al cargar datos iniciales: ' + err.message);
        toast.error('Error al cargar datos iniciales');
      }
    };
    
    loadInitialData();
  }, []);
  
  // Efecto para recargar el reporte cuando cambien los filtros
  useEffect(() => {
    if (categories.length > 0) {
      loadReport(reportType, timeRange);
    }
  }, [reportType, timeRange]);
  
  // Cargar reporte según tipo y rango de tiempo
  const loadReport = async (type, range) => {
    setLoading(true);
    try {
      let response;
      
      switch (type) {
        case 'inventory-valuation':
          response = await apiClient.get(`/reports/inventory-valuation?timeRange=${range}`);
          setReportData(response.data);
          break;
        
        case 'stock-movements':
          response = await apiClient.get(`/reports/stock-movements?timeRange=${range}`);
          setReportData(response.data);
          break;
        
        case 'low-stock':
          response = await apiClient.get('/products?lowStock=true');
          setLowStockProducts(response.data.products || []);
          break;
        
        case 'category-distribution':
          response = await apiClient.get(`/reports/category-distribution?timeRange=${range}`);
          setReportData(response.data);
          break;
          
        default:
          setError('Tipo de reporte desconocido');
          break;
      }
      
      setError(null);
    } catch (err) {
      setError('Error al cargar reporte: ' + err.message);
      toast.error('Error al cargar datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  // Configuración de gráficos según tipo de reporte
  const getChartConfig = () => {
    if (!reportData || !reportData.data) return null;
    
    switch (reportType) {
      case 'inventory-valuation':
        return {
          labels: reportData.labels || [],
          datasets: [
            {
              label: 'Valor de Costo',
              data: reportData.data.costValues || [],
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
              label: 'Valor de Venta',
              data: reportData.data.sellingValues || [],
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
            {
              label: 'Ganancia Potencial',
              data: reportData.data.potentialProfits || [],
              backgroundColor: 'rgba(153, 102, 255, 0.5)',
            }
          ]
        };
      
      case 'stock-movements':
        return {
          labels: reportData.labels || [],
          datasets: [
            {
              label: 'Entradas',
              data: reportData.data.inflows || [],
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
            {
              label: 'Salidas',
              data: reportData.data.outflows || [],
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            }
          ]
        };
      
      case 'category-distribution':
        return {
          labels: reportData.labels || [],
          datasets: [
            {
              label: 'Cantidad de Productos',
              data: reportData.data.productCounts || [],
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
            },
            {
              label: 'Valor Total (Costo)',
              data: reportData.data.costValues || [],
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
            }
          ]
        };
      
      default:
        return null;
    }
  };
  
  // Opciones para los gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: getReportTitle(),
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  
  // Obtener título según tipo de reporte
  function getReportTitle() {
    switch (reportType) {
      case 'inventory-valuation':
        return 'Valorización de Inventario';
      case 'stock-movements':
        return 'Movimientos de Stock';
      case 'low-stock':
        return 'Productos con Stock Bajo';
      case 'category-distribution':
        return 'Distribución por Categorías';
      default:
        return 'Reporte de Inventario';
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reportes de Inventario</h1>
      </div>
      
      {/* Filtros de reporte */}
      <div className="bg-white p-4 mb-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Tipo de Reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="inventory-valuation">Valorización de Inventario</option>
              <option value="stock-movements">Movimientos de Stock</option>
              <option value="low-stock">Productos con Stock Bajo</option>
              <option value="category-distribution">Distribución por Categorías</option>
            </select>
          </div>
          
          {reportType !== 'low-stock' && (
            <div>
              <label className="block mb-1">Período</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="month">Último Mes</option>
                <option value="quarter">Último Trimestre</option>
                <option value="year">Último Año</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Contenido del reporte */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-600">Cargando datos del reporte...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          {reportType === 'low-stock' ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Productos con Stock Bajo</h2>
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600">No hay productos con stock bajo actualmente</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mínimo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lowStockProducts.map(product => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{product.sku}</td>
                          <td className="px-6 py-4">{product.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{product.category.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{product.stock}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{product.minimumStock}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs ${
                              product.stock === 0
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {product.stock === 0 ? 'Sin Stock' : 'Stock Bajo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Resumen numérico */}
              {reportType === 'inventory-valuation' && reportData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm text-blue-800 font-medium">Total Valor de Costo</h3>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(reportData.summary.totalCostValue)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm text-green-800 font-medium">Total Valor de Venta</h3>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(reportData.summary.totalSellingValue)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-sm text-purple-800 font-medium">Ganancia Potencial</h3>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(reportData.summary.totalSellingValue - reportData.summary.totalCostValue)} ({reportData.summary.profitMargin.toFixed(2)}%)</p>
                  </div>
                </div>
              )}
              
              {/* Gráfico */}
              <div style={{ height: '400px' }}>
                {getChartConfig() && <Bar data={getChartConfig()} options={chartOptions} />}
              </div>
            </>
          )}
          
          {/* Detalles adicionales según el reporte */}
          {reportData.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Notas:</h3>
              <p className="text-gray-700">{reportData.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InventoryReports;
