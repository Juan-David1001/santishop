/**
 * Script para ejecutar la migración de Prisma
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Ejecutando migración de Prisma...');

try {
  // Generar la migración
  execSync('npx prisma migrate dev --name add_inventory_system', {
    stdio: 'inherit'
  });
  
  // Generar los clientes de Prisma
  execSync('npx prisma generate', {
    stdio: 'inherit'
  });
  
  console.log('✅ Migración completada exitosamente');
} catch (error) {
  console.error('❌ Error al ejecutar la migración:', error.message);
  process.exit(1);
}
