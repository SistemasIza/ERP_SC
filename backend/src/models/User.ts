import mongoose, { Document, Schema } from 'mongoose';

const UserSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'agent', 'viewer'],
    default: 'agent',
  }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
