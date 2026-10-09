import mongoose, { Document, Schema } from 'mongoose';

const ContactSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  profileName: {
    type: String,
  },
  botState: {
    type: String,
    default: 'main_menu',
  },
  customAttributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Prevent duplicate contacts per organization
ContactSchema.index({ organizationId: 1, phoneNumber: 1 }, { unique: true });

export default mongoose.model('Contact', ContactSchema);
