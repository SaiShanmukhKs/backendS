import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add new product
router.post('/', async (req, res) => {
    try {
        const product = new Product(req.body);
        const savedProduct = await product.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Bulk add products (from CSV)
router.post('/bulk', async (req, res) => {
    try {
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ message: "Payload must be an array of products" });
        }
        const savedProducts = await Product.insertMany(req.body, { ordered: false });
        res.status(201).json(savedProducts);
    } catch (error) {
        // ordered: false throws a BulkWriteError if some duplicates fail to insert but continues inserting others
        if (error.name === 'BulkWriteError') {
            return res.status(207).json({ message: 'Partial success: Some products inserted, others ignored due to duplicate SKUs.' });
        }
        res.status(500).json({ message: error.message });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
