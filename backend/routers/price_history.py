from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from bson import ObjectId
from datetime import datetime, timedelta
from database import get_db
from models.schemas import PriceHistoryCreate

router = APIRouter()

def fix_id(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/{product_id}")
async def get_price_history(
    product_id: str,
    seller_id: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
):
    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)
    query = {"product_id": product_id, "timestamp": {"$gte": since}}
    if seller_id:
        query["seller_id"] = seller_id

    cursor = db.price_history.find(query).sort("timestamp", 1)
    history = [fix_id(h) async for h in cursor]
    return {"product_id": product_id, "days": days, "data": history}


@router.get("/{product_id}/analytics")
async def get_price_analytics(product_id: str, days: int = 30):
    """Return min/max/avg and % change over the period."""
    db = get_db()
    since = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"product_id": product_id, "timestamp": {"$gte": since}}},
        {"$group": {
            "_id": None,
            "min_price": {"$min": "$price"},
            "max_price": {"$max": "$price"},
            "avg_price": {"$avg": "$price"},
            "count":     {"$sum": 1},
            "first":     {"$first": "$price"},
            "last":      {"$last": "$price"},
        }}
    ]
    result = await db.price_history.aggregate(pipeline).to_list(1)
    if not result:
        raise HTTPException(404, "No price history found")

    stats = result[0]
    stats.pop("_id", None)
    first, last = stats.get("first", 0), stats.get("last", 0)
    stats["price_change_pct"] = round(((last - first) / first) * 100, 2) if first else 0
    return stats


@router.post("/", status_code=201)
async def add_price_point(data: PriceHistoryCreate):
    db = get_db()
    doc = data.dict()
    doc["timestamp"] = datetime.utcnow()
    result = await db.price_history.insert_one(doc)

    # Update product min/max/current price
    product = await db.products.find_one({"_id": ObjectId(data.product_id)}) if ObjectId.is_valid(data.product_id) else None
    if product:
        update = {"current_price": data.price, "updated_at": datetime.utcnow()}
        if data.price < product.get("lowest_price", data.price):
            update["lowest_price"] = data.price
        if data.price > product.get("highest_price", data.price):
            update["highest_price"] = data.price
        await db.products.update_one({"_id": ObjectId(data.product_id)}, {"$set": update})

        # Check and trigger alerts
        await _check_alerts(db, data.product_id, data.price)

    return {"id": str(result.inserted_id), "message": "Price point added"}


async def _check_alerts(db, product_id: str, new_price: float):
    cursor = db.alerts.find({"product_id": product_id, "triggered": False})
    async for alert in cursor:
        if new_price <= alert["target_price"]:
            await db.alerts.update_one(
                {"_id": alert["_id"]},
                {"$set": {"triggered": True, "triggered_at": datetime.utcnow()}}
            )
            print(f"🔔 Alert triggered for {alert['user_email']} — product {product_id} at ₹{new_price}")
