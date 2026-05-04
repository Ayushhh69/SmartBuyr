from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "smartbuyr")

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
        db = client[DB_NAME]
        # Ping the server to verify connection
        await client.admin.command('ping')

        # --- Indexes ---
        await db.products.create_index([("name", "text"), ("description", "text")])
        await db.products.create_index([("category", ASCENDING)])
        await db.products.create_index([("current_price", ASCENDING)])
        await db.price_history.create_index([("product_id", ASCENDING), ("timestamp", DESCENDING)])
        await db.price_history.create_index([("seller_id", ASCENDING)])
        await db.reviews.create_index([("product_id", ASCENDING)])
        await db.reviews.create_index([("user_id", ASCENDING)])
        await db.reviews.create_index([("rating", ASCENDING)])
        await db.alerts.create_index([("user_id", ASCENDING)])
        await db.alerts.create_index([("product_id", ASCENDING)])
        
        print(f"✅ Connected to MongoDB: {DB_NAME}")
    except Exception as e:
        print(f"⚠️ Could not connect to MongoDB: {e}")
        db = None

async def close_db():
    global client
    if client:
        client.close()

def get_db():
    return db
