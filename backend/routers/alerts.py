from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime
from database import get_db
from models.schemas import AlertCreate

router = APIRouter()

def fix_id(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/user/{user_id}")
async def get_user_alerts(user_id: str):
    db = get_db()
    cursor = db.alerts.find({"user_id": user_id}).sort("created_at", -1)
    return [fix_id(a) async for a in cursor]


@router.post("/", status_code=201)
async def create_alert(data: AlertCreate):
    db = get_db()
    product = await db.products.find_one({"_id": ObjectId(data.product_id)}) if ObjectId.is_valid(data.product_id) else None
    if not product:
        raise HTTPException(404, "Product not found")

    doc = data.dict()
    doc.update({
        "product_name":               product["name"],
        "current_price_at_creation":  product["current_price"],
        "triggered":                  False,
        "triggered_at":               None,
        "created_at":                 datetime.utcnow(),
    })
    result = await db.alerts.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Alert created"}


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str):
    db = get_db()
    if not ObjectId.is_valid(alert_id):
        raise HTTPException(400, "Invalid alert ID")
    result = await db.alerts.delete_one({"_id": ObjectId(alert_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Alert not found")
    return {"message": "Alert deleted"}
