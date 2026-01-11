const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting seed...');

    // Create sample categories
    const categories = [
        { name: 'Obat Bebas' },
        { name: 'Obat Keras' },
        { name: 'Vitamin & Suplemen' },
        { name: 'Alat Kesehatan' },
        { name: 'Perawatan Tubuh' }
    ];

    console.log('Creating categories...');
    const existingCategories = await prisma.category.findMany();

    if (existingCategories.length === 0) {
        await prisma.category.createMany({
            data: categories,
            skipDuplicates: true
        });
        console.log('✅ Categories seeded');
    } else {
        console.log('✅ Categories already exist');
    }

    // Create sample products
    const sampleProducts = [
        {
            name: 'Paracetamol 500mg',
            genericName: 'Paracetamol',
            barcode: '8991234567890',
            sku: 'MED-001',
            drugType: 'Tablet',
            baseUnit: 'Strip',
            sellPrice: 5000,
            categoryId: 1
        },
        {
            name: 'Amoxicillin 500mg',
            genericName: 'Amoxicillin',
            barcode: '8991234567891',
            sku: 'MED-002',
            drugType: 'Kaplet',
            baseUnit: 'Strip',
            sellPrice: 12000,
            categoryId: 2
        },
        {
            name: 'Vitamin C 1000mg',
            genericName: 'Ascorbic Acid',
            barcode: '8991234567892',
            sku: 'VIT-001',
            drugType: 'Tablet',
            baseUnit: 'Botol',
            sellPrice: 45000,
            categoryId: 3
        }
    ];

    console.log('Creating products...');
    for (const prod of sampleProducts) {
        const existing = await prisma.product.findFirst({
            where: { sku: prod.sku }
        });

        if (!existing) {
            const product = await prisma.product.create({
                data: prod
            });

            // Add initial batch
            await prisma.productBatch.create({
                data: {
                    productId: product.id,
                    batchNumber: `BATCH-${product.sku}-001`,
                    stock: 100,
                    buyPrice: prod.sellPrice * 0.6,
                    expiryDate: new Date('2026-12-31')
                }
            });
            console.log(`  ✅ Created ${product.name}`);
        } else {
            console.log(`  ⏭️  ${prod.name} already exists`);
        }
    }

    console.log('🎉 Seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
