import express from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';

const router = express.Router();

// Get sales with optional date filtering
router.get('/', async (req, res) => {
    try {
        const { month, year, search } = req.query;
        let filter = {};

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            filter.date = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
            filter.date = { $gte: startDate, $lte: endDate };
        }

        if (search) {
            filter.$or = [
                { customerPhone: { $regex: search, $options: 'i' } },
                { 'items.name': { $regex: search, $options: 'i' } }
            ];
        }

        const sales = await Sale.find(filter).sort({ createdAt: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get monthly report data
router.get('/report', async (req, res) => {
    try {
        const { month, year } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();

        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59, 999);

        const sales = await Sale.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 });

        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalDiscount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
        const totalTransactions = sales.length;
        const avgOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

        // Top products by quantity sold
        const productMap = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (productMap[item.name]) {
                    productMap[item.name].quantity += item.quantity;
                    productMap[item.name].revenue += item.price * item.quantity;
                } else {
                    productMap[item.name] = { name: item.name, quantity: item.quantity, revenue: item.price * item.quantity };
                }
            });
        });
        const topProducts = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

        // Daily breakdown
        const dailyMap = {};
        sales.forEach(sale => {
            const day = new Date(sale.date).getDate();
            dailyMap[day] = (dailyMap[day] || 0) + sale.totalAmount;
        });
        const dailySales = Object.entries(dailyMap).map(([day, total]) => ({ day: parseInt(day), total }));

        // Payment method split
        let upiTotal = 0, cashTotal = 0;
        sales.forEach(s => {
            if (s.paymentMethod === 'UPI') upiTotal += s.totalAmount;
            else cashTotal += s.totalAmount;
        });

        res.json({
            month: m,
            year: y,
            totalRevenue,
            totalDiscount,
            totalTransactions,
            avgOrderValue,
            topProducts,
            dailySales,
            paymentSplit: { upi: upiTotal, cash: cashTotal },
            sales
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new sale and deduct stock
router.post('/', async (req, res) => {
    try {
        const { items, totalAmount, customerPhone, paymentMethod, discount, orderNotes, splitPayment } = req.body;

        // Deduct stock for each item
        for (let item of items) {
            const product = await Product.findById(item.product_id);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.name}` });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }
            product.quantity -= item.quantity;
            await product.save();
        }

        // Save sale record
        const sale = new Sale({
            items,
            totalAmount,
            customerPhone: customerPhone || '',
            paymentMethod: paymentMethod || 'Cash',
            discount: discount || 0,
            orderNotes: orderNotes || '',
            splitPayment: splitPayment || { upiAmount: 0, cashAmount: 0 }
        });
        const savedSale = await sale.save();

        res.status(201).json(savedSale);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
