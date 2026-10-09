import mongoose, { Document, Schema } from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Dashboard user/agent
    default: null,
  },
  status: {
    type: String,
    enum: ['open', 'resolved', 'bot_handled'],
    default: 'bot_handled',
  },
  tags: [{ type: String }],
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Conversation', ConversationSchema);
