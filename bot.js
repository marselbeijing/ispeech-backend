const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const Invoice = require('./models/Invoice');
const Subscription = require('./models/Subscription');

class TelegramStarsBot {
  constructor(token) {
    this.bot = new TelegramBot(token);
    this.setupWebhooks();
  }

  setupWebhooks() {
    // Обработка pre_checkout_query
    this.bot.on('pre_checkout_query', async (query) => {
      try {
        await this.handlePreCheckoutQuery(query);
      } catch (error) {
        console.error('Ошибка обработки pre_checkout_query:', error);
        await this.bot.answerPreCheckoutQuery(query.id, false, {
          error_message: 'Произошла ошибка при обработке платежа'
        });
      }
    });

    // Обработка успешного платежа
    this.bot.on('message', async (msg) => {
      if (msg.successful_payment) {
        try {
          await this.handleSuccessfulPayment(msg);
        } catch (error) {
          console.error('Ошибка обработки successful_payment:', error);
        }
      }
    });

    // Команда /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
🎉 Добро пожаловать в iSpeech Helper!

Это приложение поможет вам улучшить речь и дикцию. 

Для доступа ко всем функциям приобретите подписку:
⭐ Месячная - 299 Stars
⭐ Квартальная - 799 Stars (скидка 20%)
⭐ Годовая - 1999 Stars (скидка 40%)

Откройте приложение, чтобы начать тренировки!
      `;

      await this.bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: [
            [{
              text: '🚀 Открыть приложение',
              web_app: { url: process.env.WEBAPP_URL || 'https://i-speech-helper-uce4.vercel.app/' }
            }]
          ]
        }
      });
    });

    // Команда /paysupport - обязательная для платежных ботов
    this.bot.onText(/\/paysupport/, async (msg) => {
      const chatId = msg.chat.id;
      const supportMessage = `
🛠 Поддержка по платежам

По вопросам, связанным с платежами и подписками, обращайтесь:
📧 Email: support@ispeechhelper.com
💬 Telegram: @ispeechhelper_support

Мы ответим в течение 24 часов.

⚠️ Внимание: Поддержка Telegram не сможет помочь с вопросами по платежам в этом боте.
      `;

      await this.bot.sendMessage(chatId, supportMessage);
    });
  }

  async handlePreCheckoutQuery(query) {
    const { id, from, currency, total_amount, invoice_payload } = query;

    console.log('Pre-checkout query received:', {
      queryId: id,
      userId: from.id,
      amount: total_amount,
      payload: invoice_payload
    });

    // Находим инвойс по payload
    const invoice = await Invoice.findOne({ 
      payload: invoice_payload,
      status: 'created'
    });

    if (!invoice) {
      console.log('Invoice not found for payload:', invoice_payload);
      await this.bot.answerPreCheckoutQuery(id, false, {
        error_message: 'Инвойс не найден или уже оплачен. Создайте новый.'
      });
      return;
    }

    // Проверяем соответствие суммы
    if (total_amount !== invoice.stars) {
      console.log('Amount mismatch:', { expected: invoice.stars, received: total_amount });
      await this.bot.answerPreCheckoutQuery(id, false, {
        error_message: 'Неверная сумма платежа'
      });
      return;
    }

    // Проверяем, не истек ли инвойс
    if (new Date() > invoice.expiresAt) {
      console.log('Invoice expired:', invoice.expiresAt);
      await this.bot.answerPreCheckoutQuery(id, false, {
        error_message: 'Инвойс истек. Создайте новый.'
      });
      return;
    }

    // Проверяем соответствие пользователя
    if (invoice.userId !== from.id.toString()) {
      console.log('User ID mismatch:', { expected: invoice.userId, received: from.id });
      await this.bot.answerPreCheckoutQuery(id, false, {
        error_message: 'Этот инвойс создан для другого пользователя'
      });
      return;
    }

    // Одобряем платеж
    console.log('Pre-checkout approved for:', invoice_payload);
    await this.bot.answerPreCheckoutQuery(id, true);
  }

  async handleSuccessfulPayment(msg) {
    const { successful_payment, from, chat } = msg;
    const { 
      currency, 
      total_amount, 
      invoice_payload, 
      telegram_payment_charge_id 
    } = successful_payment;

    console.log('Successful payment received:', {
      userId: from.id,
      amount: total_amount,
      payload: invoice_payload,
      chargeId: telegram_payment_charge_id
    });

    // Находим инвойс
    const invoice = await Invoice.findOne({ 
      payload: invoice_payload 
    });

    if (!invoice) {
      console.error('Invoice not found for successful payment:', invoice_payload);
      await this.bot.sendMessage(chat.id, 
        '❌ Ошибка: инвойс не найден. Обратитесь в поддержку.'
      );
      return;
    }

    // Обновляем статус инвойса
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.telegramPaymentChargeId = telegram_payment_charge_id;
    await invoice.save();

    // Создаем подписку
    const SUBSCRIPTION_CONFIG = {
      monthly: { duration: 30 },
      quarterly: { duration: 90 },
      yearly: { duration: 365 },
    };

    const config = SUBSCRIPTION_CONFIG[invoice.subscriptionType];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.duration);

    // Деактивируем старые подписки пользователя
    await Subscription.updateMany(
      { userId: invoice.userId, isActive: true },
      { isActive: false }
    );

    const subscription = new Subscription({
      userId: invoice.userId,
      type: invoice.subscriptionType,
      stars: invoice.stars,
      transactionId: invoice._id.toString(),
      telegramPaymentChargeId: telegram_payment_charge_id,
      invoicePayload: invoice_payload,
      expiresAt,
      status: 'paid',
      isActive: true,
    });

    await subscription.save();

    // Отправляем подтверждение пользователю
    const subscriptionNames = {
      monthly: 'месячная',
      quarterly: 'квартальная', 
      yearly: 'годовая'
    };

    const confirmationMessage = `
✅ Платеж успешно обработан!

🎉 Ваша ${subscriptionNames[invoice.subscriptionType]} подписка активирована!
⏰ Действует до: ${expiresAt.toLocaleDateString('ru-RU')}
⭐ Потрачено Stars: ${total_amount}

Теперь вам доступны все функции приложения!
    `;

    await this.bot.sendMessage(chat.id, confirmationMessage, {
      reply_markup: {
        inline_keyboard: [
          [{
            text: '🚀 Открыть приложение',
            web_app: { url: process.env.WEBAPP_URL || 'https://i-speech-helper-uce4.vercel.app/' }
          }]
        ]
      }
    });

    console.log('Subscription created successfully:', {
      userId: invoice.userId,
      type: invoice.subscriptionType,
      expiresAt
    });
  }

  // Метод для настройки webhook (вызывается при запуске сервера)
  async setWebhook(webhookUrl) {
    try {
      await this.bot.setWebHook(`${webhookUrl}/api/telegram/webhook`);
      console.log('Webhook установлен:', `${webhookUrl}/api/telegram/webhook`);
    } catch (error) {
      console.error('Ошибка установки webhook:', error);
    }
  }

  // Метод для обработки webhook запросов
  processUpdate(update) {
    this.bot.processUpdate(update);
  }
}

module.exports = TelegramStarsBot; 