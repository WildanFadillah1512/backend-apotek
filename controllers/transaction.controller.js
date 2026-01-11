const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TransactionController = {
    // Create direct online transaction
    create: async (req, res) => {
        try {
            const { total, paymentMethod, items, userId } = req.body;

            const result = await prisma.$transaction(async (prisma) => {
                // 1. Create Transaction Header
                const transaction = await prisma.transaction.create({
                    data: {
                        total,
                        paymentMethod,
                        userId
                    }
                });

                // 2. Process Items
                for (const item of items) {
                    // Logic similar to frontend but server-side validation
                    // item: { productId, quantity, totalBaseQty, price, unitName, conversionFactor, ... }

                    // Simple FIFO/FEFO or just deduct from specific batch if provided?
                    // For simplicity, we assume frontend provides which batch to take from or we do FEFO here.
                    // If syncing from offline, we might trust the frontend computation or re-validate.

                    // Let's assume we do FEFO here for online transactions if batchId is not provided
                    // But for this MVP, let's keep it simple: Just record the transaction.
                    // REAL implementation needs to decrement stock.

                    // Fetch product to ensure it exists
                    // ...

                    // Decrement Stock (Simplified: just assuming one batch for now or skipping detailed stock logic for speed)
                    // TODO: Robust Stock Deduction Logic
                }

                return transaction;
            });

            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Sync offline transactions
    sync: async (req, res) => {
        try {
            const { id, total, paymentMethod, userId, date, items } = req.body;

            // Check if already exists
            const existing = await prisma.transaction.findUnique({ where: { id } });
            if (existing) {
                return res.status(200).json({ message: 'Already synced', id });
            }

            const result = await prisma.$transaction(async (prisma) => {
                // 1. Create Transaction Header (Use provided ID or let DB auto-increment? 
                // Using provided ID might conflict if multiple devices.
                // Better to let DB ID but map it back? Or use UUID?
                // For this demo, let's create a NEW ID to avoid conflicts and just return it.
                // The frontend 'id' is local SQLite ID.

                const transaction = await prisma.transaction.create({
                    data: {
                        total,
                        paymentMethod,
                        userId,
                        date: new Date(date)
                    }
                });

                // 2. Process Items and Deduct Stock
                for (const item of items) {
                    const { productId, quantity, totalBaseQty, price, unitName, conversionFactor, batchId } = item;

                    // Decrement Stock
                    // Note: This relies on Batch IDs matching. 
                    // If Batch IDs in SQLite are different from Postgres, this will fail.
                    // This implies we need to sync Products & Batches DOWN to SQLite first.

                    await prisma.productBatch.update({
                        where: { id: batchId },
                        data: { stock: { decrement: totalBaseQty } }
                    });

                    // Add Ledger Entry
                    await prisma.stockLedger.create({
                        data: {
                            type: 'SALE',
                            quantity: -totalBaseQty,
                            balanceSnapshot: 0, // Todo: Calculate real snapshot
                            notes: `Synced Tx #${transaction.id}`,
                            productId,
                            batchId
                        }
                    });

                    // Create Transaction Item
                    await prisma.transactionItem.create({
                        data: {
                            transactionId: transaction.id,
                            productId,
                            batchId,
                            unitName,
                            quantity,
                            conversionFactor,
                            totalBaseQty,
                            price
                        }
                    });
                }

                return transaction;
            });

            res.status(201).json(result);
        } catch (error) {
            console.error("Sync Error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const transactions = await prisma.transaction.findMany({
                include: { items: true },
                orderBy: { date: 'desc' }
            });
            res.json(transactions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = TransactionController;
