import React, { useEffect, useState } from 'react';
import './TelegramLoginButton.css';

export default function TelegramLoginButton() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function authorize() {
      console.log('=== Telegram WebApp Debug ===');
      console.log('window.Telegram:', window.Telegram);
      console.log('window.Telegram.WebApp:', window.Telegram?.WebApp);
      console.log('initData:', window.Telegram?.WebApp?.initData);
      console.log('initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
      console.log('initDataUnsafe.user:', window.Telegram?.WebApp?.initDataUnsafe?.user);

      if (
        window.Telegram &&
        window.Telegram.WebApp
      ) {
        const initData = window.Telegram.WebApp.initData;
        const initDataUnsafe = window.Telegram.WebApp.initDataUnsafe;

        // Если есть initData, пробуем авторизацию через сервер
        if (initData && initData.trim() !== '') {
          console.log('Отправляем initData на сервер для валидации...');
          try {
            const res = await fetch('http://localhost:3001/api/auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${initData}`,
              },
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data && data.user) {
                console.log('Получены валидированные данные пользователя:', data.user);
                setUser(data.user);
                setLoading(false);
                return;
              }
            } else {
              console.error('Ошибка сервера:', res.status, res.statusText);
            }
          } catch (e) {
            console.error('Ошибка соединения с сервером:', e);
            // Fallback на initDataUnsafe если сервер недоступен
            if (initDataUnsafe?.user) {
              console.log('Сервер недоступен, используем initDataUnsafe как fallback');
              setUser(initDataUnsafe.user);
              setLoading(false);
              return;
            }
          }
        }

        // Если initData пустой, но есть initDataUnsafe.user (для разработки)
        if (initDataUnsafe?.user) {
          console.log('initData пустой, используем initDataUnsafe для разработки');
          setUser(initDataUnsafe.user);
          setLoading(false);
          return;
        }

        // Если нет данных пользователя
        setLoading(false);
        setError('Данные пользователя не получены. Убедитесь, что приложение открыто через Telegram Mini App.');
      } else {
        // Telegram WebApp API недоступен
        setLoading(false);
        setError('Для авторизации откройте приложение через Telegram Mini App на телефоне или в Telegram Desktop. В браузере авторизация недоступна.');
      }
    }
    
    // Небольшая задержка для инициализации Telegram WebApp
    setTimeout(authorize, 100);
  }, []);

  if (user) {
    return (
      <div className="account-card">
        <div className="account-avatar">
          <img
            src={user.photo_url || 'https://telegram.org/img/t_logo.png'}
            alt={user.first_name}
            className="account-avatar-img"
          />
        </div>
        <div className="account-info">
          <div className="account-name">{user.first_name} {user.last_name || ''}</div>
          <div className="account-id">ID: {user.id}</div>
          <div className="account-status success">Авторизация через Telegram выполнена</div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-card">
      <div className="account-avatar">
        <img src="https://telegram.org/img/t_logo.png" alt="Telegram" className="account-avatar-img" />
      </div>
      <div className="account-info">
        <div className="account-name">Гость</div>
        <div className="account-id">ID: —</div>
        <div className="account-status error">
          {loading ? 'Проверка авторизации...' : error || 'Авторизация через Telegram...'}
        </div>
      </div>
    </div>
  );
} 