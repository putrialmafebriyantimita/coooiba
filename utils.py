import os
import requests
from dotenv import load_dotenv

load_dotenv()  # penting kalau kamu pakai .env

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def send_alert(text):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }
    try:
        resp = requests.post(url, json=payload)
        resp.raise_for_status()
        print("Telegram alert sent")
    except Exception as e:
        print("Error sending alert:", e)
