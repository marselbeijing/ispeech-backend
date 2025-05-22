from fastapi import FastAPI, Request, HTTPException
import hashlib
import hmac
import os
import requests

app = FastAPI()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

def check_telegram_auth(data: dict) -> bool:
    auth_data = data.copy()
    hash_ = auth_data.pop('hash')
    data_check_string = '\n'.join([f"{k}={v}" for k, v in sorted(auth_data.items())])
    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
    hmac_string = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return hmac_string == hash_

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

