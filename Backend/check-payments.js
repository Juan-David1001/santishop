const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.supplierPayment.findMany();
  console.log(JSON.stringify(payments, null, 2));
  
  // También revisar el esquema de la tabla
  const dmmf = prisma._dmmf.modelMap.SupplierPayment;
  console.log("\nEsquema del modelo SupplierPayment:");
  console.log(JSON.stringify(dmmf.fields, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
