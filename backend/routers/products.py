from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from database import get_db
from models.schemas import ProductCreate, ProductUpdate

router = APIRouter()

def fix_id(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.get("/")
async def list_products(
    category: Optional[str] = None,
    brand:    Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by:  str = "created_at",
    order:    int = -1,
    limit:    int = Query(20, le=100),
    skip:     int = 0,
):
    db = get_db()
    query = {}
    if category:  query["category"]      = category
    if brand:     query["brand"]         = brand
    if min_price is not None or max_price is not None:
        query["current_price"] = {}
        if min_price is not None: query["current_price"]["$gte"] = min_price
        if max_price is not None: query["current_price"]["$lte"] = max_price

    cursor = db.products.find(query).sort(sort_by, order).skip(skip).limit(limit)
    products = [fix_id(p) async for p in cursor]
    total = await db.products.count_documents(query)
    return {"products": products, "total": total, "skip": skip, "limit": limit}


@router.get("/search")
async def search_products(q: str = Query(..., min_length=1)):
    db = get_db()
    cursor = db.products.find({"$text": {"$search": q}}, {"score": {"$meta": "textScore"}}) \
                        .sort([("score", {"$meta": "textScore"})]).limit(20)
    return [fix_id(p) async for p in cursor]


@router.get("/categories")
async def get_categories():
    db = get_db()
    categories = await db.products.distinct("category")
    return {"categories": categories}


@router.get("/{product_id}")
async def get_product(product_id: str):
    db = get_db()
    if not ObjectId.is_valid(product_id):
        raise HTTPException(400, "Invalid product ID")
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(404, "Product not found")
    return fix_id(product)


@router.post("/", status_code=201)
async def create_product(data: ProductCreate):
    db = get_db()
    doc = data.dict()
    doc.update({
        "lowest_price":  data.current_price,
        "highest_price": data.current_price,
        "avg_rating":    0.0,
        "review_count":  0,
        "seller_prices": [],
        "created_at":    datetime.utcnow(),
        "updated_at":    datetime.utcnow(),
    })
    result = await db.products.insert_one(doc)

    # seed initial price history
    await db.price_history.insert_one({
        "product_id":  str(result.inserted_id),
        "seller_id":   "default",
        "seller_name": "Default Seller",
        "price":       data.current_price,
        "timestamp":   datetime.utcnow(),
        "source":      "manual",
    })
    return {"id": str(result.inserted_id), "message": "Product created"}


@router.put("/{product_id}")
async def update_product(product_id: str, data: ProductUpdate):
    db = get_db()
    if not ObjectId.is_valid(product_id):
        raise HTTPException(400, "Invalid product ID")
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    result = await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found")
    return {"message": "Product updated"}


@router.delete("/{product_id}")
async def delete_product(product_id: str):
    db = get_db()
    if not ObjectId.is_valid(product_id):
        raise HTTPException(400, "Invalid product ID")
    result = await db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Product not found")
    return {"message": "Product deleted"}


@router.get("/{product_id}/compare")
async def compare_sellers(product_id: str):
    """Return seller price comparison for a product."""
    db = get_db()
    if not ObjectId.is_valid(product_id):
        raise HTTPException(400, "Invalid product ID")
    product = await db.products.find_one({"_id": ObjectId(product_id)}, {"seller_prices": 1, "name": 1})
    if not product:
        raise HTTPException(404, "Product not found")
    sellers = sorted(product.get("seller_prices", []), key=lambda x: x["price"])
    return {"product_id": product_id, "product_name": product["name"], "sellers": sellers}
