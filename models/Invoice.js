const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  subscriptionType: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true,
  },
  stars: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  payload: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['created', 'paid', 'expired', 'cancelled'],
    default: 'created',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
  },
  paidAt: {
    type: Date,
  },
  telegramPaymentChargeId: {
    type: String,
  },
}, {
  timestamps: true,
});

// Индексы
invoiceSchema.index({ payload: 1 });
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema); 