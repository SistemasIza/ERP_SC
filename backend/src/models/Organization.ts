import mongoose, { Document, Schema } from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  whatsappConfig: {
    phoneNumberId: { type: String, default: null },
    accessToken: { type: String, default: null },
    verifyToken: { type: String, default: null },
  },
  settings: {
    botEnabled: { type: Boolean, default: true },
    timezone: { type: String, default: 'UTC' }
  }
}, { timestamps: true });

export default mongoose.model('Organization', OrganizationSchema);
