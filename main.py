from fastapi import FastAPI, Request, HTTPException
import hashlib
import hmac
import os
import requests
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Разрешаем CORS для фронтенда на Vercel и для локальной разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://i-speech-helper-uce4.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

def check_telegram_auth(data: dict) -> bool:
    auth_data = data.copy()
    hash_ = auth_data.pop('hash')
    data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(auth_data.items())])
    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
    hmac_string = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return hmac_string == hash_

@app.get("/api/subscriptions/status/{user_id}")
def get_subscription_status(user_id: str):
    # Заглушка: всегда возвращаем неактивную подписку
    return {
        "userId": user_id,
        "isActive": False,
        "expiresAt": None
    }

@app.post("/send_message")
async def send_message(request: Request):
    data = await request.json()
    user = data.get("user")
    message = data.get("message")
    if not user or not message:
        raise HTTPException(status_code=400, detail="Missing user or message")
    if not check_telegram_auth(user):
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")
    chat_id = user["id"]
    resp = requests.post(f"{TELEGRAM_API_URL}/sendMessage", json={
        "chat_id": chat_id,
        "text": message
    })
    return {"ok": resp.ok}

