import mongoose, { Document, Schema } from 'mongoose';

const AnalyticsSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  date: {
    type: String, // e.g. "2023-10-01"
    required: true,
  },
  metrics: {
    messagesSent: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    newContacts: { type: Number, default: 0 },
    flowCompletions: { type: Number, default: 0 },
  }
}, { timestamps: true });

// Ensure we only have one analytics document per organization per day
AnalyticsSchema.index({ organizationId: 1, date: 1 }, { unique: true });

export default mongoose.model('Analytics', AnalyticsSchema);
