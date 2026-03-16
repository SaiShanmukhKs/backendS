import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 0 },
    sku: { type: String, required: true, unique: true },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
