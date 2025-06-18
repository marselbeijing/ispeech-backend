const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: true,
  },
  stars: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  telegramPaymentChargeId: {
    type: String,
    required: true,
  },
  invoicePayload: {
    type: String,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Индекс для быстрого поиска активных подписок
subscriptionSchema.index({ userId: 1, isActive: 1 });
subscriptionSchema.index({ telegramPaymentChargeId: 1 });
subscriptionSchema.index({ status: 1 });

// Метод для проверки активности подписки
subscriptionSchema.methods.isValid = function() {
  return this.isActive && this.expiresAt > new Date();
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 