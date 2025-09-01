/**
 * Script para poblar la base de datos con datos iniciales
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Comenzando a poblar la base de datos...');

  // Crear categorías iniciales
  const categories = [
    { name: 'Alimentos', description: 'Productos alimenticios' },
    { name: 'Bebidas', description: 'Bebidas alcohólicas y no alcohólicas' },
    { name: 'Limpieza', description: 'Productos de limpieza' },
    { name: 'Cuidado Personal', description: 'Productos de higiene y cuidado personal' },
    { name: 'Hogar', description: 'Artículos para el hogar' }
  ];

  console.log('Creando categorías...');
  for (const category of categories) {
    const exists = await prisma.category.findFirst({ where: { name: category.name } });
    if (!exists) {
      await prisma.category.create({ data: category });
      console.log(`  - Categoría "${category.name}" creada`);
    } else {
      console.log(`  - Categoría "${category.name}" ya existe`);
    }
  }

  // Crear productos de ejemplo
  const products = [
    {
      sku: 'ALI001',
      name: 'Arroz Premium 1kg',
      description: 'Arroz de grano largo calidad premium',
      costPrice: 3500,
      sellingPrice: 4800,
      stock: 50,
      minimumStock: 10,
      categoryName: 'Alimentos'
    },
    {
      sku: 'ALI002',
      name: 'Frijoles Rojos 500g',
      description: 'Frijoles rojos seleccionados',
      costPrice: 2800,
      sellingPrice: 3900,
      stock: 40,
      minimumStock: 8,
      categoryName: 'Alimentos'
    },
    {
      sku: 'BEB001',
      name: 'Agua Mineral 1.5L',
      description: 'Agua mineral sin gas',
      costPrice: 1200,
      sellingPrice: 2000,
      stock: 60,
      minimumStock: 15,
      categoryName: 'Bebidas'
    },
    {
      sku: 'BEB002',
      name: 'Refresco Cola 2L',
      description: 'Refresco cola tradicional',
      costPrice: 3000,
      sellingPrice: 4500,
      stock: 45,
      minimumStock: 12,
      categoryName: 'Bebidas'
    },
    {
      sku: 'LIM001',
      name: 'Detergente Multiusos 1L',
      description: 'Detergente líquido para todo tipo de superficies',
      costPrice: 4500,
      sellingPrice: 6800,
      stock: 30,
      minimumStock: 5,
      categoryName: 'Limpieza'
    }
  ];

  console.log('Creando productos...');
  for (const product of products) {
    const exists = await prisma.product.findFirst({ where: { sku: product.sku } });
    if (!exists) {
      const category = await prisma.category.findFirst({
        where: { name: product.categoryName }
      });

      if (!category) {
        console.log(`  - Error: No se encontró la categoría "${product.categoryName}"`);
        continue;
      }

      const newProduct = await prisma.product.create({
        data: {
          sku: product.sku,
          name: product.name,
          description: product.description,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          stock: product.stock,
          minimumStock: product.minimumStock,
          categoryId: category.id
        }
      });

      // Registrar movimiento de stock inicial
      await prisma.stockMovement.create({
        data: {
          productId: newProduct.id,
          quantity: product.stock,
          type: 'entrada',
          reference: 'Inventario inicial',
          notes: 'Creado durante el seeding'
        }
      });

      console.log(`  - Producto "${product.name}" (${product.sku}) creado`);
    } else {
      console.log(`  - Producto "${product.name}" (${product.sku}) ya existe`);
    }
  }

  console.log('Base de datos poblada exitosamente');
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
