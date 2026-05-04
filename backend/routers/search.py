"""
/api/search  — Live search across Amazon.in and Flipkart.com
─────────────────────────────────────────────────────────────
Runs both scrapers concurrently via asyncio + ThreadPoolExecutor,
merges and deduplicates results, and caches them in MongoDB so the
same query doesn't hit the sites again for 30 minutes.
"""

import asyncio
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from database import get_db
from scrapers.amazon import search_amazon
from scrapers.flipkart import search_flipkart

router = APIRouter()
logger = logging.getLogger(__name__)

# Shared thread pool — keeps scraping off the async event loop
_executor = ThreadPoolExecutor(max_workers=4)

CACHE_TTL_MINUTES = 30  # How long to reuse cached results


# ── Helpers ───────────────────────────────────────────────────────────────────
def _cache_key(query: str) -> str:
    return hashlib.md5(query.lower().strip().encode()).hexdigest()


async def _get_cache(query: str) -> Optional[list]:
    db = get_db()
    key = _cache_key(query)
    doc = await db.search_cache.find_one({"_id": key})
    if not doc:
        return None
    age = datetime.utcnow() - doc["cached_at"]
    if age > timedelta(minutes=CACHE_TTL_MINUTES):
        await db.search_cache.delete_one({"_id": key})
        return None
    return doc["results"]


async def _set_cache(query: str, results: list):
    db = get_db()
    key = _cache_key(query)
    await db.search_cache.replace_one(
        {"_id": key},
        {"_id": key, "query": query, "results": results, "cached_at": datetime.utcnow()},
        upsert=True,
    )


async def _run_in_executor(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, fn, *args)


def _merge_results(amazon: list, flipkart: list) -> list:
    """
    Interleave Amazon and Flipkart results so users see both sources
    side-by-side rather than all of one then all of another.
    """
    merged = []
    max_len = max(len(amazon), len(flipkart))
    for i in range(max_len):
        if i < len(amazon):
            merged.append(amazon[i])
        if i < len(flipkart):
            merged.append(flipkart[i])
    return merged


# ── Routes ────────────────────────────────────────────────────────────────────
@router.get("/")
async def live_search(
    q:           str   = Query(..., min_length=1, description="Search query"),
    max_results: int   = Query(10, ge=1, le=24),
    source:      str   = Query("all", description="amazon | flipkart | all"),
    use_cache:   bool  = Query(True, description="Use cached results if fresh"),
):
    """
    Search Amazon.in and/or Flipkart.com and return merged results.
    Results are cached in MongoDB for 30 minutes per query.
    """
    q = q.strip()
    if not q:
        raise HTTPException(400, "Query cannot be empty")

    # ── Cache hit ──────────────────────────────────────────────────────────────
    cache_key_full = f"{q}:{source}:{max_results}"
    if use_cache:
        cached = await _get_cache(cache_key_full)
        if cached is not None:
            return {
                "query":   q,
                "source":  source,
                "total":   len(cached),
                "cached":  True,
                "results": cached,
            }

    # ── Concurrent scrape ─────────────────────────────────────────────────────
    amazon_results, flipkart_results = [], []

    if source in ("amazon", "all"):
        amazon_task = _run_in_executor(search_amazon, q, max_results)
    else:
        amazon_task = asyncio.sleep(0)  # no-op

    if source in ("flipkart", "all"):
        flipkart_task = _run_in_executor(search_flipkart, q, max_results)
    else:
        flipkart_task = asyncio.sleep(0)

    results = await asyncio.gather(amazon_task, flipkart_task, return_exceptions=True)

    if source in ("amazon", "all") and not isinstance(results[0], Exception):
        amazon_results = results[0] or []
    elif isinstance(results[0], Exception):
        logger.error(f"Amazon scrape failed: {results[0]}")

    if source in ("flipkart", "all") and not isinstance(results[1], Exception):
        flipkart_results = results[1] or []
    elif isinstance(results[1], Exception):
        logger.error(f"Flipkart scrape failed: {results[1]}")

    merged = _merge_results(amazon_results, flipkart_results)

    # ── Save to cache ──────────────────────────────────────────────────────────
    if merged:
        await _set_cache(cache_key_full, merged)

    # ── Save new products to DB (background) ──────────────────────────────────
    asyncio.create_task(_persist_products(merged))

    return {
        "query":           q,
        "source":          source,
        "total":           len(merged),
        "amazon_count":    len(amazon_results),
        "flipkart_count":  len(flipkart_results),
        "cached":          False,
        "results":         merged,
    }


async def _persist_products(results: list):
    """
    Upsert scraped products into the products collection so they appear
    in the main catalogue and can have price history tracked.
    """
    db = get_db()
    for r in results:
        if not r.get("price"):
            continue
        try:
            existing = await db.products.find_one({
                "name": {"$regex": r["title"][:40], "$options": "i"}
            })
            price = r["price"]
            seller = "Amazon" if r["source"] == "amazon" else "Flipkart"
            seller_entry = {
                "seller_name": seller,
                "price":       price,
                "in_stock":    r.get("in_stock", True),
                "url":         r.get("product_url", ""),
            }

            if existing:
                # Update price history
                await db.price_history.insert_one({
                    "product_id":   str(existing["_id"]),
                    "seller_id":    r["source"],
                    "seller_name":  seller,
                    "price":        price,
                    "timestamp":    datetime.utcnow(),
                    "source":       "scraper",
                })
                # Update seller_prices array
                await db.products.update_one(
                    {"_id": existing["_id"], "seller_prices.seller_name": seller},
                    {"$set": {"seller_prices.$.price": price, "updated_at": datetime.utcnow()}}
                )
            else:
                # Create new product
                doc = {
                    "name":          r["title"],
                    "description":   f"Found on {seller}",
                    "category":      "Uncategorised",
                    "brand":         r["title"].split()[0] if r["title"] else "Unknown",
                    "image_url":     r.get("image_url"),
                    "current_price": price,
                    "lowest_price":  price,
                    "highest_price": price,
                    "avg_rating":    r.get("rating") or 0.0,
                    "review_count":  r.get("review_count") or 0,
                    "seller_prices": [seller_entry],
                    "tags":          [r["source"]],
                    "created_at":    datetime.utcnow(),
                    "updated_at":    datetime.utcnow(),
                }
                await db.products.insert_one(doc)
        except Exception as e:
            logger.debug(f"Product persist error: {e}")


@router.get("/suggestions")
async def search_suggestions(q: str = Query(..., min_length=1)):
    """
    Return recent search queries from the cache for autocomplete.
    """
    db = get_db()
    cursor = db.search_cache.find(
        {"query": {"$regex": f"^{q}", "$options": "i"}},
        {"query": 1}
    ).sort("cached_at", -1).limit(6)
    docs = [d["query"] async for d in cursor]
    return {"suggestions": docs}


@router.delete("/cache")
async def clear_search_cache():
    """Admin endpoint to clear the search cache."""
    db = get_db()
    result = await db.search_cache.delete_many({})
    return {"deleted": result.deleted_count}
