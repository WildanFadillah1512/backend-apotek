const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ProductController = {
    getAll: async (req, res) => {
        try {
            // Fetch products with their batches to calculate total stock
            const products = await prisma.product.findMany({
                include: {
                    category: true,
                    batches: true,
                    units: true
                }
            });

            // Map to add totalStock property consistent with frontend expectation
            const productsWithStock = products.map(p => ({
                ...p,
                totalStock: p.batches.reduce((sum, batch) => sum + batch.stock, 0)
            }));

            res.json(productsWithStock);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    create: async (req, res) => {
        try {
            const { name, price, stock, categoryId } = req.body;

            // Transaction to create product and initial batch if stock is provided
            const result = await prisma.$transaction(async (prisma) => {
                const product = await prisma.product.create({
                    data: {
                        name,
                        sellPrice: price, // Mapped to sellPrice as per schema
                        categoryId
                    }
                });

                if (stock > 0) {
                    await prisma.productBatch.create({
                        data: {
                            product: { connect: { id: product.id } },
                            batchNumber: `INITIAL-${Date.now()}`,
                            stock: parseInt(stock),
                            buyPrice: 0, // Default or require from request
                            expiryDate: null // Default
                        }
                    });
                }

                return product;
            });

            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = ProductController;
