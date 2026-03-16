import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    upiId: { type: String, default: '' },
    merchantName: { type: String, default: 'Supermarket' }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
