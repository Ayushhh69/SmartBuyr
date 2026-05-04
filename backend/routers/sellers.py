from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime
from database import get_db

router = APIRouter()

def fix_id(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@router.get("/")
async def list_sellers():
    db = get_db()
    cursor = db.sellers.find({}).sort("name", 1)
    return [fix_id(s) async for s in cursor]

@router.post("/", status_code=201)
async def create_seller(name: str, website: str = None):
    db = get_db()
    doc = {"name": name, "website": website, "rating": 0.0, "verified": False, "created_at": datetime.utcnow()}
    result = await db.sellers.insert_one(doc)
    return {"id": str(result.inserted_id)}
