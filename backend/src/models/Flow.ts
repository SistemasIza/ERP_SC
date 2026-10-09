import mongoose, { Document, Schema } from 'mongoose';

const FlowSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  name: {
    type: String,
    required: true,
    default: 'Nuevo Flujo'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  nodes: [{
    id: String,
    type: { type: String, enum: ['trigger', 'text', 'interactive'] },
    position: {
      x: Number,
      y: Number
    },
    data: mongoose.Schema.Types.Mixed
  }],
  edges: [{
    id: String,
    source: String,
    target: String,
    sourceHandle: String,
    targetHandle: String
  }]
}, { timestamps: true });

export default mongoose.model('Flow', FlowSchema);
