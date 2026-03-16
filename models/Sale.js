import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
});

const saleSchema = new mongoose.Schema({
    items: [saleItemSchema],
    totalAmount: { type: Number, required: true },
    customerPhone: { type: String, default: '' },
    paymentMethod: { type: String, enum: ['UPI', 'Cash', 'Split'], default: 'Cash' },
    discount: { type: Number, default: 0 },
    orderNotes: { type: String, default: '' },
    splitPayment: {
        upiAmount: { type: Number, default: 0 },
        cashAmount: { type: Number, default: 0 }
    },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Sale', saleSchema);
