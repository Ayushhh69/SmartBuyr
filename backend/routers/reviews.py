from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from database import get_db
from models.schemas import ReviewCreate

router = APIRouter()

def fix_id(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

POSITIVE_WORDS = {"great","excellent","amazing","love","perfect","best","fantastic","good","awesome","superb","happy","satisfied","recommend"}
NEGATIVE_WORDS = {"bad","terrible","awful","worst","horrible","poor","disappointing","broken","waste","defective","useless","regret","return"}

def _analyze_sentiment(text: str) -> str:
    words = set(text.lower().split())
    pos = len(words & POSITIVE_WORDS)
    neg = len(words & NEGATIVE_WORDS)
    if pos > neg:   return "positive"
    elif neg > pos: return "negative"
    return "neutral"


@router.get("/{product_id}")
async def get_reviews(
    product_id: str,
    sort_by: str = "created_at",
    rating:  int = Query(None, ge=1, le=5),
    limit:   int = Query(20, le=100),
    skip:    int = 0,
):
    db = get_db()
    query = {"product_id": product_id}
    if rating:
        query["rating"] = rating
    cursor = db.reviews.find(query).sort(sort_by, -1).skip(skip).limit(limit)
    reviews = [fix_id(r) async for r in cursor]
    total   = await db.reviews.count_documents(query)
    return {"reviews": reviews, "total": total}


@router.get("/{product_id}/summary")
async def get_review_summary(product_id: str):
    """Rating distribution + sentiment breakdown."""
    db = get_db()
    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {
            "_id": "$rating",
            "count": {"$sum": 1}
        }}
    ]
    dist_raw = await db.reviews.aggregate(pipeline).to_list(5)
    distribution = {str(int(d["_id"])): d["count"] for d in dist_raw}

    sentiment_pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
    ]
    sent_raw   = await db.reviews.aggregate(sentiment_pipeline).to_list(3)
    sentiments = {s["_id"]: s["count"] for s in sent_raw if s["_id"]}

    total = await db.reviews.count_documents({"product_id": product_id})
    avg_pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
    ]
    avg_result = await db.reviews.aggregate(avg_pipeline).to_list(1)
    avg_rating = round(avg_result[0]["avg"], 1) if avg_result else 0

    return {
        "total": total,
        "avg_rating": avg_rating,
        "distribution": distribution,
        "sentiments": sentiments,
    }


@router.post("/", status_code=201)
async def create_review(data: ReviewCreate):
    db = get_db()
    doc = data.dict()
    doc["sentiment"]  = _analyze_sentiment(data.body)
    doc["helpful"]    = {"yes": 0, "no": 0}
    doc["created_at"] = datetime.utcnow()
    result = await db.reviews.insert_one(doc)

    # Recalculate avg rating on the product
    pipeline = [
        {"$match": {"product_id": data.product_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    stats = await db.reviews.aggregate(pipeline).to_list(1)
    if stats:
        await db.products.update_one(
            {"_id": ObjectId(data.product_id)} if ObjectId.is_valid(data.product_id) else {},
            {"$set": {"avg_rating": round(stats[0]["avg"], 1), "review_count": stats[0]["count"]}}
        )
    return {"id": str(result.inserted_id), "sentiment": doc["sentiment"]}


@router.post("/{review_id}/helpful")
async def mark_helpful(review_id: str, helpful: bool = True):
    db = get_db()
    if not ObjectId.is_valid(review_id):
        raise HTTPException(400, "Invalid review ID")
    field = "helpful.yes" if helpful else "helpful.no"
    await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$inc": {field: 1}})
    return {"message": "Recorded"}


@router.delete("/{review_id}")
async def delete_review(review_id: str):
    db = get_db()
    if not ObjectId.is_valid(review_id):
        raise HTTPException(400, "Invalid review ID")
    result = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Review not found")
    return {"message": "Review deleted"}
