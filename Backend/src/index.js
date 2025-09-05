const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/validationMiddleware');
const config = require('./config/config');

// Importar rutas
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const saleRoutes = require('./routes/saleRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const shiftClosureRoutes = require('./routes/shiftClosureRoutes');
const supplierPaymentRoutes = require('./routes/supplierPaymentRoutes');
const clientRoutes = require('./routes/clientRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Inicializar Express app
const app = express();
const PORT = config.port;

// Middleware global
app.use(cors({
  origin: '*', // Permite conexiones desde cualquier origen
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Upgrade', 'Connection'],
  credentials: true
}));
app.use(express.json());

// Rutas para el sistema de inventario
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// Rutas para ventas, usuarios, turnos, clientes y pagos a proveedores
app.use('/api/sales', saleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/shift-closures', shiftClosureRoutes);
app.use('/api/supplier-payments', supplierPaymentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/health-check', healthRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Crear un servidor HTTP para Express y WebSocket
const http = require('http');
const server = http.createServer(app);

// Configurar WebSocket en el mismo servidor
const WebSocket = require('ws');
const setupWebSocketServer = require('../websocket-setup');

// Iniciar el servidor en el puerto configurado
server.listen(PORT, () => {
  console.log(`Servidor HTTP y WebSocket corriendo en el puerto ${PORT}`);
  
  // Inicializar el servidor WebSocket con el servidor HTTP
  setupWebSocketServer(server);
});

// Manejar cierre controlado
process.on('SIGINT', async () => {
  const prisma = require('./config/db');
  await prisma.$disconnect();
  console.log('Conexión con la base de datos cerrada');
  server.close(() => {
    console.log('Servidor HTTP y WebSocket cerrados');
    process.exit(0);
  });
});
