const express = require('express');
const cors = require('cors');
const { validate, parse } = require('@telegram-apps/init-data-node');

const app = express();
const PORT = 3001;

// Токен вашего бота
const BOT_TOKEN = '8067453876:AAGjndZO4UX7G_8C5MDnRUMp88dalb-J-p0';

// Настройка CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'], // добавьте ваш домен
  credentials: true
}));

app.use(express.json());

// Эндпоинт для авторизации
app.post('/api/auth', (req, res) => {
  console.log('=== Auth Request ===');
  console.log('Headers:', req.headers);
  
  const authHeader = req.headers.authorization || '';
  const [type, initData] = authHeader.split(' ');
  
  console.log('Auth type:', type);
  console.log('InitData:', initData);
  
  if (type !== 'tma' || !initData) {
    console.log('Unauthorized: missing or invalid auth header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Валидация initData с токеном бота
    validate(initData, BOT_TOKEN, { 
      expiresIn: 3600 // данные действительны 1 час
    });
    
    // Парсинг валидных данных
    const data = parse(initData);
    console.log('Parsed data:', data);
    
    if (data.user) {
      console.log('User authenticated:', data.user);
      res.json({ user: data.user });
    } else {
      console.log('No user data in initData');
      res.status(401).json({ error: 'No user data' });
    }
  } catch (e) {
    console.error('Validation error:', e.message);
    res.status(401).json({ error: 'Invalid initData: ' + e.message });
  }
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 Bot token: ${BOT_TOKEN.substring(0, 10)}...`);
}); 