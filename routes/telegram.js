const express = require('express');
const router = express.Router();

// Webhook endpoint для Telegram
router.post('/webhook', (req, res) => {
  try {
    const update = req.body;
    
    // Получаем экземпляр бота из app
    const telegramBot = req.app.get('telegramBot');
    
    if (telegramBot) {
      telegramBot.processUpdate(update);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    res.status(500).send('Error');
  }
});

module.exports = router; 