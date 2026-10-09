import mongoose, { Document, Schema } from 'mongoose';

const MessageSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'interactive', 'template', 'unknown'],
    default: 'text',
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // allows storing { body: "hello" } or image URLs
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
  },
  whatsappMessageId: {
    type: String,
  }
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
