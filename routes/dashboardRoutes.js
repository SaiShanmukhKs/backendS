import express from 'express';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';

const router = express.Router();

// Get dashboard statistics
router.get('/', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const lowStockAlerts = await Product.find({ quantity: { $lt: 10 } }).limit(5);

        // Calculate total revenue and monthly sales
        const sales = await Sale.find();
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalSales = sales.length;
        const averageOrderValue = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

        // Today's sales
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaySalesData = sales.filter(s => new Date(s.date) >= todayStart);
        const todaySalesCount = todaySalesData.length;
        const todayRevenue = todaySalesData.reduce((sum, s) => sum + s.totalAmount, 0);

        // Group sales by month (simple version for the current year)
        const monthlySalesMap = {};
        const currentYear = new Date().getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months.forEach(m => { monthlySalesMap[m] = 0; });

        sales.forEach(sale => {
            const d = new Date(sale.date);
            if (d.getFullYear() === currentYear) {
                const month = months[d.getMonth()];
                monthlySalesMap[month] += sale.totalAmount;
            }
        });

        const monthlySales = months.map(month => ({
            name: month,
            total: monthlySalesMap[month]
        }));

        // Stock distribution by category
        const products = await Product.find();
        const categoryMap = {};
        products.forEach(p => {
            categoryMap[p.category] = (categoryMap[p.category] || 0) + p.quantity;
        });

        const stockByCategory = Object.keys(categoryMap).map(category => ({
            name: category,
            value: categoryMap[category]
        }));

        // Top selling products (by quantity sold)
        const productSalesMap = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (productSalesMap[item.name]) {
                    productSalesMap[item.name].qty += item.quantity;
                    productSalesMap[item.name].revenue += item.price * item.quantity;
                } else {
                    productSalesMap[item.name] = { name: item.name, qty: item.quantity, revenue: item.price * item.quantity };
                }
            });
        });
        const topProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

        // Daily sales for current month
        const currentMonth = new Date().getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailySalesMap = {};
        for (let i = 1; i <= daysInMonth; i++) { dailySalesMap[i] = 0; }
        sales.forEach(sale => {
            const d = new Date(sale.date);
            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                dailySalesMap[d.getDate()] += sale.totalAmount;
            }
        });
        const dailySales = Object.entries(dailySalesMap).map(([day, total]) => ({ day: `Day ${day}`, total }));

        // Payment method totals
        let upiRevenue = 0, cashRevenue = 0;
        sales.forEach(s => {
            if (s.paymentMethod === 'UPI') upiRevenue += s.totalAmount;
            else cashRevenue += s.totalAmount;
        });

        res.json({
            totalProducts,
            totalSales,
            totalRevenue,
            averageOrderValue,
            todaySalesCount,
            todayRevenue,
            lowStockAlerts,
            monthlySales,
            stockByCategory,
            topProducts,
            dailySales,
            paymentSplit: { upi: upiRevenue, cash: cashRevenue }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
