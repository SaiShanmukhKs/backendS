import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_supermanage_pro';

// Middleware to verify token
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token' });
    }
};

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid username or password' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid username or password' });

        // Create and assign token
        const token = jwt.sign({ _id: user._id, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, upiId: user.upiId, merchantName: user.merchantName });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Setup Initial Admin Account (Run once or manually hit if DB is empty)
router.post('/setup', async (req, res) => {
    try {
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const admin = new User({
            username: 'admin',
            password: hashedPassword,
            upiId: 'merchant@upi',
            merchantName: 'SuperManage PRO'
        });

        await admin.save();
        res.status(201).json({ message: 'Admin user created successfully. Use admin/admin123 to login.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update Profile (UPI Configuration)
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { upiId, merchantName } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { upiId, merchantName },
            { new: true }
        ).select('-password');
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get Profile Info
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
