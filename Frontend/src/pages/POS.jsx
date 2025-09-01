import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import apiClient from '../utils/apiClient';

const POS = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', document: '', email: '' });
  const [paymentInfo, setPaymentInfo] = useState({
    methods: [{ type: 'efectivo', amount: 0, reference: '' }],
    usePoints: false,
    pointsToRedeem: 0
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('percent');
  const [notes, setNotes] = useState('');
  const [sale, setSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const searchInputRef = useRef(null);
  const customerSearchRef = useRef(null);

  useEffect(() => {
    // Cargar usuarios y turnos activos al iniciar
    fetchUsers();
    
    // Focus en el campo de búsqueda al cargar
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Verificar turno activo cuando cambia el usuario seleccionado
    if (selectedUser) {
      fetchActiveShift(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    // Buscar productos cuando cambia la query de búsqueda
    if (searchQuery.length >= 2) {
      searchProducts(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    // Buscar clientes cuando cambia la query de búsqueda de clientes
    if (customerSearch.length >= 2) {
      searchCustomers(customerSearch);
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  useEffect(() => {
    // Actualizar monto del método de pago efectivo cuando cambia el total
    if (cart.length > 0 && paymentInfo.methods.length > 0) {
      const total = calculateTotal();
      const updatedMethods = [...paymentInfo.methods];
      updatedMethods[0].amount = total;
      setPaymentInfo({ ...paymentInfo, methods: updatedMethods });
    }
  }, [cart, taxRate, discountAmount, discountPercent, discountType]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
      
      // Seleccionar el primer usuario por defecto
      if (response.data.length > 0) {
        setSelectedUser(response.data[0]);
      }
    } catch (error) {
      toast.error('Error al cargar usuarios');
      console.error('Error loading users:', error);
    }
  };

  const fetchActiveShift = async (userId) => {
    try {
      const response = await apiClient.get(`/shifts?userId=${userId}&active=true`);
      if (response.data && response.data.length > 0) {
        setActiveShift(response.data[0]);
      } else {
        setActiveShift(null);
        toast.error('El usuario seleccionado no tiene un turno activo');
      }
    } catch (error) {
      toast.error('Error al verificar turno activo');
      console.error('Error checking active shift:', error);
    }
  };

  const searchProducts = async (query) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/sales/search-products?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data.products || []);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Error al buscar productos');
    } finally {
      setIsLoading(false);
    }
  };

  const searchCustomers = async (query) => {
    try {
      const response = await apiClient.get(`/clients/search?query=${encodeURIComponent(query)}`);
      setCustomerResults(response.data.clients || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const addToCart = (product) => {
    // Verificar si el producto ya está en el carrito
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Incrementar cantidad si ya existe
      const updatedCart = cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } 
          : item
      );
      setCart(updatedCart);
    } else {
      // Agregar nuevo item al carrito
      const newItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: product.sellingPrice,
        quantity: 1,
        totalPrice: product.sellingPrice,
        stock: product.stock
      };
      setCart([...cart, newItem]);
    }
    
    // Limpiar búsqueda y volver a enfocar
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const updateCartItem = (index, field, value) => {
    const updatedCart = [...cart];
    const item = { ...updatedCart[index] };
    
    if (field === 'quantity') {
      const newQuantity = parseInt(value);
      
      // Validar que la cantidad no exceda el stock disponible
      if (newQuantity > item.stock) {
        toast.error(`Solo hay ${item.stock} unidades disponibles`);
        return;
      }
      
      item.quantity = newQuantity;
      item.totalPrice = newQuantity * item.unitPrice;
    } else if (field === 'unitPrice') {
      const newPrice = parseFloat(value);
      item.unitPrice = newPrice;
      item.totalPrice = item.quantity * newPrice;
    }
    
    updatedCart[index] = item;
    setCart(updatedCart);
  };

  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  const clearCart = () => {
    if (window.confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      setCart([]);
      setCustomer(null);
      setPaymentInfo({
        methods: [{ type: 'efectivo', amount: 0, reference: '' }],
        usePoints: false,
        pointsToRedeem: 0
      });
      setDiscountAmount(0);
      setDiscountPercent(0);
      setNotes('');
    }
  };

  const selectCustomer = (client) => {
    setCustomer(client);
    setCustomerResults([]);
    setCustomerSearch('');
  };

  const clearCustomer = () => {
    setCustomer(null);
  };

  const handleCustomerInputChange = (e) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  const createCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.name) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    
    try {
      const response = await apiClient.post('/clients', newCustomer);
      setCustomer(response.data);
      setShowCustomerForm(false);
      setNewCustomer({ name: '', phone: '', document: '' });
      toast.success('Cliente creado correctamente');
    } catch (error) {
      toast.error('Error al crear el cliente');
      console.error('Error creating customer:', error);
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    
    if (discountType === 'percent') {
      return (subtotal * (discountPercent / 100));
    } else {
      return discountAmount;
    }
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return (subtotal - discount) * (taxRate / 100);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    
    let total = subtotal - discount + tax;
    
    // Restar puntos si se están usando
    if (customer && paymentInfo.usePoints && paymentInfo.pointsToRedeem > 0) {
      const pointsValue = paymentInfo.pointsToRedeem * 0.1; // Valor de cada punto (ajustar según configuración)
      total -= Math.min(pointsValue, total); // No permitir que el total sea negativo
    }
    
    return Math.max(total, 0);
  };

  const calculatePointsToEarn = () => {
    const total = calculateTotal();
    // Configuración: 1 punto por cada 10 unidades monetarias gastadas
    return Math.floor(total / 10);
  };

  const addPaymentMethod = () => {
    const newMethod = { type: 'tarjeta', amount: 0, reference: '' };
    setPaymentInfo({
      ...paymentInfo,
      methods: [...paymentInfo.methods, newMethod]
    });
  };

  const removePaymentMethod = (index) => {
    if (paymentInfo.methods.length === 1) {
      toast.error('Debe haber al menos un método de pago');
      return;
    }
    
    const updatedMethods = [...paymentInfo.methods];
    updatedMethods.splice(index, 1);
    
    setPaymentInfo({
      ...paymentInfo,
      methods: updatedMethods
    });
  };

  const updatePaymentMethod = (index, field, value) => {
    const updatedMethods = [...paymentInfo.methods];
    updatedMethods[index] = { 
      ...updatedMethods[index], 
      [field]: field === 'amount' ? parseFloat(value) : value 
    };
    
    setPaymentInfo({
      ...paymentInfo,
      methods: updatedMethods
    });
  };

  const totalPaymentAmount = () => {
    return paymentInfo.methods.reduce((sum, method) => sum + (parseFloat(method.amount) || 0), 0);
  };

  const handleProceedToPayment = () => {
    if (!selectedUser || !activeShift) {
      toast.error('Debes seleccionar un usuario con turno activo');
      return;
    }
    
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    
    // Inicializar montos de pago
    const total = calculateTotal();
    const updatedMethods = [...paymentInfo.methods];
    updatedMethods[0].amount = total;
    
    setPaymentInfo({
      ...paymentInfo,
      methods: updatedMethods
    });
    
    setShowPaymentModal(true);
  };

  const handleCheckout = async () => {
    const total = calculateTotal();
    const paymentTotal = totalPaymentAmount();
    
    if (Math.abs(total - paymentTotal) > 0.01) {
      toast.error(`El monto total de los pagos (${formatCurrency(paymentTotal)}) no coincide con el total de la venta (${formatCurrency(total)})`);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        payments: paymentInfo.methods.map(method => ({
          type: method.type,
          amount: method.amount,
          reference: method.reference
        })),
        userId: selectedUser.id,
        shiftId: activeShift.id,
        clientId: customer ? customer.id : null,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: calculateDiscount(),
        amount: total,
        pointsEarned: customer ? calculatePointsToEarn() : 0,
        pointsRedeemed: customer && paymentInfo.usePoints ? paymentInfo.pointsToRedeem : 0,
        notes: notes
      };
      
      const response = await apiClient.post('/sales', saleData);
      
      // Mostrar ticket
      setSale(response.data);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      
      // Limpiar carrito y resetear estado
      setCart([]);
      setCustomer(null);
      setPaymentInfo({
        methods: [{ type: 'efectivo', amount: 0, reference: '' }],
        usePoints: false,
        pointsToRedeem: 0
      });
      setDiscountAmount(0);
      setDiscountPercent(0);
      setNotes('');
      
      toast.success('Venta registrada correctamente');
    } catch (error) {
      console.error('Error processing checkout:', error);
      toast.error(error.response?.data?.error || 'Error al procesar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    // Abrir ventana de impresión
    const printWindow = window.open('', '', 'height=600,width=400');
    
    // Contenido de la impresión
    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante de Venta</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            .header h1 {
              font-size: 18px;
              margin: 0;
            }
            .header p {
              margin: 3px 0;
            }
            .details {
              margin: 10px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              text-align: left;
              padding: 3px;
            }
            .right {
              text-align: right;
            }
            .totals {
              margin-top: 10px;
              border-top: 1px dashed #000;
              padding-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tienda BR165</h1>
            <p>Calle Principal #123</p>
            <p>Tel: (123) 456-7890</p>
            <p>${new Date(sale.createdAt).toLocaleString()}</p>
            <p>Ticket #${sale.id}</p>
            <p>Le atendió: ${sale.user?.name || 'Vendedor'}</p>
          </div>
          
          ${sale.client ? `
            <div class="customer">
              <p><strong>Cliente:</strong> ${sale.client.name}</p>
              ${sale.client.document ? `<p><strong>Documento:</strong> ${sale.client.document}</p>` : ''}
              ${sale.client.phone ? `<p><strong>Teléfono:</strong> ${sale.client.phone}</p>` : ''}
            </div>
          ` : ''}
          
          <div class="details">
            <table>
              <tr>
                <th>Producto</th>
                <th>Cant</th>
                <th>Precio</th>
                <th class="right">Total</th>
              </tr>
              ${sale.saleItems.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td class="right">${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td class="right">${formatCurrency(sale.subtotal)}</td>
              </tr>
              ${sale.discount > 0 ? `
                <tr>
                  <td>Descuento:</td>
                  <td class="right">-${formatCurrency(sale.discount)}</td>
                </tr>
              ` : ''}
              ${sale.tax > 0 ? `
                <tr>
                  <td>Impuesto:</td>
                  <td class="right">${formatCurrency(sale.tax)}</td>
                </tr>
              ` : ''}
              <tr>
                <td><strong>TOTAL:</strong></td>
                <td class="right"><strong>${formatCurrency(sale.amount)}</strong></td>
              </tr>
            </table>
            
            ${sale.payments.length > 0 ? `
              <table style="margin-top: 10px;">
                <tr>
                  <th colspan="2">Forma de pago:</th>
                </tr>
                ${sale.payments.map(payment => `
                  <tr>
                    <td>${payment.type === 'efectivo' ? 'Efectivo' : 
                        payment.type === 'tarjeta' ? 'Tarjeta' : 
                        payment.type === 'transferencia' ? 'Transferencia' : 
                        payment.type === 'puntos' ? 'Puntos' : payment.type}</td>
                    <td class="right">${formatCurrency(payment.amount)}</td>
                  </tr>
                `).join('')}
              </table>
            ` : ''}
            
            ${sale.client && sale.pointsEarned > 0 ? `
              <p>Puntos ganados en esta compra: ${sale.pointsEarned}</p>
            ` : ''}
            ${sale.client && sale.pointsRedeemed > 0 ? `
              <p>Puntos canjeados: ${sale.pointsRedeemed}</p>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>¡Gracias por su compra!</p>
            <p>Regrese pronto</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Imprimir después de un breve retraso para asegurarse de que el contenido esté completamente cargado
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="h-full flex">
      {/* Panel izquierdo - Búsqueda y carrito */}
      <div className="w-2/3 p-4 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Punto de Venta</h2>
          
          {/* Selector de usuario y estado de turno */}
          <div className="flex items-center mb-4 space-x-4 p-2 bg-gray-100 rounded">
            <div>
              <label className="block text-sm font-medium text-gray-700">Usuario:</label>
              <select 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const userId = parseInt(e.target.value);
                  const user = users.find(u => u.id === userId);
                  setSelectedUser(user);
                }}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Estado del turno:</p>
              {activeShift ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Turno activo #{activeShift.id}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Sin turno activo
                </span>
              )}
            </div>
          </div>
          
          {/* Búsqueda de productos */}
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="text"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos por nombre, SKU o código de barras..."
                className="w-full p-3 border rounded focus:ring focus:ring-blue-200 focus:border-blue-500"
              />
              {isLoading && (
                <div className="ml-2">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
          
          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="mb-6 bg-white rounded shadow max-h-72 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(product.sellingPrice)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${product.stock <= 0 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                        {product.stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stock <= 0}
                          className={`text-white px-3 py-1 rounded ${product.stock <= 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          Agregar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Carrito de compras */}
          <div className="bg-white rounded shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Carrito</h3>
              <button 
                onClick={clearCart}
                disabled={cart.length === 0}
                className={`text-white px-3 py-1 rounded ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Vaciar
              </button>
            </div>
            
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">El carrito está vacío</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cart.map((item, index) => (
                      <tr key={`${item.productId}-${index}`}>
                        <td className="px-3 py-2 whitespace-normal text-sm">{item.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateCartItem(index, 'unitPrice', e.target.value)}
                            className="w-24 p-1 border rounded text-right"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) => updateCartItem(index, 'quantity', e.target.value)}
                            className="w-16 p-1 border rounded text-center"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => removeFromCart(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
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
      
      {/* Panel derecho - Cliente, totales y pago */}
      <div className="w-1/3 bg-gray-50 p-4 border-l border-gray-200 flex flex-col">
        {/* Sección de cliente */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">Cliente</h3>
          
          {customer ? (
            <div className="bg-white p-3 rounded border mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  {customer.document && <p className="text-sm text-gray-600">Doc: {customer.document}</p>}
                  {customer.phone && <p className="text-sm text-gray-600">Tel: {customer.phone}</p>}
                  <p className="text-sm mt-1">
                    <span className="font-medium">Puntos disponibles:</span> {customer.totalPoints - customer.usedPoints || 0}
                  </p>
                </div>
                <button
                  onClick={clearCustomer}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  ref={customerSearchRef}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Buscar cliente por nombre, documento o teléfono..."
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={() => setShowCustomerForm(true)}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Nuevo
                </button>
              </div>
              
              {customerResults.length > 0 && (
                <div className="bg-white rounded shadow max-h-48 overflow-y-auto mb-2">
                  <ul className="divide-y divide-gray-200">
                    {customerResults.map(client => (
                      <li 
                        key={client.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => selectCustomer(client)}
                      >
                        <p className="font-medium">{client.name}</p>
                        <div className="flex space-x-4 text-sm text-gray-600">
                          {client.document && <p>Doc: {client.document}</p>}
                          {client.phone && <p>Tel: {client.phone}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Sección de descuentos e impuestos */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">Descuentos e Impuestos</h3>
          
          <div className="bg-white p-3 rounded border space-y-3">
            {/* Descuentos */}
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 mr-2">Descuento:</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="border p-1 rounded text-sm"
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="amount">Monto fijo</option>
                </select>
              </div>
              
              {discountType === 'percent' ? (
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="p-1 border rounded w-20 text-right"
                  />
                  <span className="ml-1">%</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="mr-1">$</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="p-1 border rounded w-24 text-right"
                  />
                </div>
              )}
            </div>
            
            {/* Impuestos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto (%):</label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="p-1 border rounded w-20 text-right"
                />
                <span className="ml-1">%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notas */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">Notas</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Añadir notas a la venta..."
            className="w-full p-2 border rounded min-h-[60px]"
          />
        </div>
        
        {/* Totales */}
        <div className="mt-auto">
          <div className="bg-white p-3 rounded border mb-4">
            <div className="flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            {calculateDiscount() > 0 && (
              <div className="flex justify-between mb-1 text-red-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(calculateDiscount())}</span>
              </div>
            )}
            {calculateTax() > 0 && (
              <div className="flex justify-between mb-1">
                <span>Impuesto:</span>
                <span>{formatCurrency(calculateTax())}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
          
          <button
            onClick={handleProceedToPayment}
            disabled={cart.length === 0 || !activeShift}
            className={`w-full py-3 rounded font-bold text-white text-lg ${cart.length === 0 || !activeShift ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            Proceder al Pago
          </button>
        </div>
        
        {/* Modal de Creación de Cliente */}
        {showCustomerForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
              <h3 className="font-bold text-lg mb-4">Nuevo Cliente</h3>
              
              <form onSubmit={createCustomer}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre*:</label>
                  <input
                    type="text"
                    name="name"
                    value={newCustomer.name}
                    onChange={handleCustomerInputChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Documento:</label>
                  <input
                    type="text"
                    name="document"
                    value={newCustomer.document}
                    onChange={handleCustomerInputChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono:</label>
                  <input
                    type="text"
                    name="phone"
                    value={newCustomer.phone}
                    onChange={handleCustomerInputChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico:</label>
                  <input
                    type="email"
                    name="email"
                    value={newCustomer.email}
                    onChange={handleCustomerInputChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm(false)}
                    className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Modal de Pago */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">Finalizar Venta</h3>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">Resumen</h4>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="flex justify-between mb-1">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {calculateDiscount() > 0 && (
                    <div className="flex justify-between mb-1 text-red-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(calculateDiscount())}</span>
                    </div>
                  )}
                  {calculateTax() > 0 && (
                    <div className="flex justify-between mb-1">
                      <span>Impuesto:</span>
                      <span>{formatCurrency(calculateTax())}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                    <span>Total a pagar:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
              
              {/* Uso de puntos si hay cliente */}
              {customer && (customer.totalPoints - customer.usedPoints) > 0 && (
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="usePoints"
                      checked={paymentInfo.usePoints}
                      onChange={(e) => setPaymentInfo({...paymentInfo, usePoints: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="usePoints" className="font-medium">Usar puntos</label>
                  </div>
                  
                  {paymentInfo.usePoints && (
                    <div className="bg-gray-50 p-3 rounded border">
                      <p className="text-sm mb-2">Puntos disponibles: {customer.totalPoints - customer.usedPoints}</p>
                      <div className="flex items-center">
                        <label className="text-sm mr-2">Puntos a usar:</label>
                        <input
                          type="number"
                          min="0"
                          max={customer.totalPoints - customer.usedPoints}
                          value={paymentInfo.pointsToRedeem}
                          onChange={(e) => setPaymentInfo({...paymentInfo, pointsToRedeem: parseInt(e.target.value) || 0})}
                          className="p-1 border rounded w-20 text-right"
                        />
                        <span className="text-sm ml-2">= {formatCurrency(paymentInfo.pointsToRedeem * 0.1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Métodos de pago */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Métodos de Pago</h4>
                  <button
                    onClick={addPaymentMethod}
                    className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  >
                    + Añadir método
                  </button>
                </div>
                
                <div className="space-y-3">
                  {paymentInfo.methods.map((method, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      <div className="flex justify-between items-center mb-2">
                        <select
                          value={method.type}
                          onChange={(e) => updatePaymentMethod(index, 'type', e.target.value)}
                          className="p-1 border rounded"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="tarjeta">Tarjeta</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="otro">Otro</option>
                        </select>
                        
                        {index > 0 && (
                          <button
                            onClick={() => removePaymentMethod(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500">Monto</label>
                          <div className="flex items-center">
                            <span className="mr-1">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={method.amount}
                              onChange={(e) => updatePaymentMethod(index, 'amount', e.target.value)}
                              className="p-1 border rounded flex-1 text-right"
                            />
                          </div>
                        </div>
                        
                        {method.type !== 'efectivo' && (
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500">Referencia</label>
                            <input
                              type="text"
                              value={method.reference}
                              onChange={(e) => updatePaymentMethod(index, 'reference', e.target.value)}
                              placeholder={method.type === 'tarjeta' ? "Últimos 4 dígitos" : "# de referencia"}
                              className="p-1 border rounded w-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between mt-3 font-medium">
                  <span>Total pagado:</span>
                  <span className={Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01 ? 'text-red-600' : ''}>
                    {formatCurrency(totalPaymentAmount())}
                  </span>
                </div>
                
                {Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01 && (
                  <p className="text-red-600 text-sm mt-1">
                    {totalPaymentAmount() < calculateTotal() 
                      ? `Falta: ${formatCurrency(calculateTotal() - totalPaymentAmount())}` 
                      : `Sobra: ${formatCurrency(totalPaymentAmount() - calculateTotal())}`}
                  </p>
                )}
              </div>
              
              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01}
                  className={`px-4 py-2 rounded text-white ${
                    isProcessing || Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isProcessing ? 'Procesando...' : 'Finalizar Venta'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Comprobante */}
        {showReceiptModal && sale && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4">Comprobante de Venta #{sale.id}</h3>
              
              <div className="mb-4">
                <p><strong>Fecha:</strong> {new Date(sale.createdAt).toLocaleString()}</p>
                <p><strong>Vendedor:</strong> {sale.user ? sale.user.name : 'No especificado'}</p>
                {sale.client && (
                  <div className="mt-2">
                    <p><strong>Cliente:</strong> {sale.client.name || 'Sin nombre'}</p>
                    {sale.client.document && <p><strong>Documento:</strong> {sale.client.document}</p>}
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Productos</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Producto</th>
                      <th className="px-2 py-1 text-right">Cant.</th>
                      <th className="px-2 py-1 text-right">Precio</th>
                      <th className="px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.saleItems && sale.saleItems.map(item => (
                      <tr key={item.id} className="border-b">
                        <td className="px-2 py-1">{item.product.name}</td>
                        <td className="px-2 py-1 text-right">{item.quantity}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount && sale.discount > 0 && (
                  <div className="flex justify-between mb-1 text-red-600">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                {sale.tax && sale.tax > 0 && (
                  <div className="flex justify-between mb-1">
                    <span>Impuesto:</span>
                    <span>{formatCurrency(sale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(sale.amount)}</span>
                </div>
              </div>
              
              {sale.payments && sale.payments.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Formas de Pago</h4>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left">Método</th>
                        <th className="px-2 py-1 text-right">Monto</th>
                        <th className="px-2 py-1">Referencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.payments.map(payment => (
                        <tr key={payment.id} className="border-b">
                          <td className="px-2 py-1">
                            {payment.type === 'efectivo' ? 'Efectivo' : 
                             payment.type === 'tarjeta' ? 'Tarjeta' : 
                             payment.type === 'transferencia' ? 'Transferencia' : 
                             payment.type}
                          </td>
                          <td className="px-2 py-1 text-right">{formatCurrency(payment.amount)}</td>
                          <td className="px-2 py-1">{payment.reference || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {sale.client && (sale.pointsEarned || sale.pointsRedeemed) && ((sale.pointsEarned > 0 || sale.pointsRedeemed > 0)) && (
                <div className="mb-4 p-2 bg-blue-50 rounded">
                  {sale.pointsEarned > 0 && (
                    <p><strong>Puntos ganados:</strong> {sale.pointsEarned}</p>
                  )}
                  {sale.pointsRedeemed > 0 && (
                    <p><strong>Puntos canjeados:</strong> {sale.pointsRedeemed}</p>
                  )}
                </div>
              )}
              
              {sale.notes && (
                <div className="mb-4">
                  <h4 className="font-medium mb-1">Notas:</h4>
                  <p className="text-sm bg-gray-50 p-2 rounded">{sale.notes}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handlePrintReceipt}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Imprimir
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;
