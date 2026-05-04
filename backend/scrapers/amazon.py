"""
Amazon.in scraper  — FIXED VERSION
─────────────────────────────────────────────────────────────────────────────
FIXES APPLIED:
  1. Removed `'i': 'electronics'` category filter — this was causing 0 results
     for non-electronic searches (frother, shoes, kitchen items, etc.)
  2. Added original_price extraction from `.a-text-price .a-offscreen`
  3. Added discount_pct calculation from original vs current price
  4. Added `original_price` and `discount_pct` to the returned dict so the
     frontend can show strikethrough prices and savings badges
  5. Improved price selectors with additional fallbacks
  6. Added page title check to detect bot/CAPTCHA blocks early
"""

import re
import time
import random
import logging
from typing import Optional
from dataclasses import dataclass, field

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_URL   = "https://www.amazon.in"
SEARCH_URL = "https://www.amazon.in/s"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15",
]

# ── Data model ────────────────────────────────────────────────────────────────
@dataclass
class AmazonProduct:
    title:          str
    price:          Optional[float]
    original_price: Optional[float]
    discount_pct:   Optional[int]
    rating:         Optional[float]
    review_count:   Optional[int]
    image_url:      Optional[str]
    product_url:    str
    asin:           Optional[str]
    sponsored:      bool = False
    prime:          bool = False
    in_stock:       bool = True
    source:         str  = "amazon"


# ── Helpers ───────────────────────────────────────────────────────────────────
def _headers() -> dict:
    return {
        "User-Agent":      random.choice(USER_AGENTS),
        "Accept-Language": "en-IN,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Connection":      "keep-alive",
        "DNT":             "1",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control":   "no-cache",
        "Referer":         "https://www.amazon.in/",
    }


def _clean_price(raw: str) -> Optional[float]:
    """Extract numeric price from strings like '₹24,999' or '24999.00'."""
    if not raw:
        return None
    cleaned = re.sub(r"[₹,\s]", "", raw)
    try:
        return float(cleaned)
    except ValueError:
        return None


def _clean_rating(raw: str) -> Optional[float]:
    """Extract rating from '4.5 out of 5 stars'."""
    if not raw:
        return None
    m = re.search(r"(\d+\.?\d*)", raw)
    return float(m.group(1)) if m else None


def _clean_reviews(raw: str) -> Optional[int]:
    """Extract review count from '(1,234)' or '1,234 ratings'."""
    if not raw:
        return None
    # Handle K notation: "1.2K ratings"
    m = re.search(r"(\d+\.?\d*)\s*[Kk]", raw)
    if m:
        return int(float(m.group(1)) * 1000)
    cleaned = re.sub(r"[(),\s]", "", raw)
    try:
        return int(cleaned.replace(",", ""))
    except ValueError:
        return None


def _extract_asin(url: str) -> Optional[str]:
    m = re.search(r"/dp/([A-Z0-9]{10})", url)
    return m.group(1) if m else None


def _fetch(url: str, params: dict = None, retries: int = 3) -> Optional[BeautifulSoup]:
    """Fetch a URL with retries and return a BeautifulSoup object."""
    for attempt in range(retries):
        try:
            resp = requests.get(
                url, params=params, headers=_headers(),
                timeout=15, allow_redirects=True
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.content, "lxml")
                # Detect CAPTCHA / bot block pages
                page_title = soup.find("title")
                if page_title and "robot" in page_title.get_text().lower():
                    logger.warning("Amazon returned CAPTCHA/robot page")
                    return None
                return soup
            elif resp.status_code == 503:
                logger.warning(f"Amazon returned 503 (attempt {attempt+1}/{retries}) — backing off")
                time.sleep(2 ** attempt + random.uniform(0.5, 1.5))
            else:
                logger.warning(f"Amazon returned {resp.status_code}")
                return None
        except requests.RequestException as e:
            logger.error(f"Request failed (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
    return None


# ── Parser ────────────────────────────────────────────────────────────────────
def _parse_product_card(card) -> Optional[AmazonProduct]:
    """Parse a single Amazon search result card."""
    try:
        # Sponsored check
        sponsored = bool(
            card.get("data-component-type") == "sp-sponsored-result" or
            card.select_one('[data-component-type="s-sponsored-label-info-icon"]')
        )

        # Title
        title_el = (
            card.select_one("h2 a span") or
            card.select_one('[data-cy="title-recipe"] span') or
            card.select_one(".s-title-instructions-style span")
        )
        if not title_el:
            return None
        title = title_el.get_text(strip=True)
        if not title or len(title) < 5:
            return None

        # URL
        link_el = card.select_one("h2 a") or card.select_one("a.s-link-style")
        href = link_el["href"] if link_el and link_el.get("href") else ""
        product_url = BASE_URL + href if href.startswith("/") else href
        asin = _extract_asin(product_url) or card.get("data-asin")

        # ✅ FIX: Current/discounted price
        price = None
        for sel in [
            ".a-price .a-offscreen",
            ".a-price-whole",
            '[data-cy="price-recipe"] .a-offscreen',
            ".s-price-instructions-style .a-offscreen",
        ]:
            el = card.select_one(sel)
            if el:
                price = _clean_price(el.get_text(strip=True))
                if price:
                    break

        # ✅ FIX: Original/MRP price (was missing entirely before)
        original_price = None
        for sel in [
            ".a-text-price .a-offscreen",           # standard MRP
            ".a-price.a-text-price .a-offscreen",   # variant
            "span[data-a-strike='true'] .a-offscreen",
        ]:
            el = card.select_one(sel)
            if el:
                original_price = _clean_price(el.get_text(strip=True))
                if original_price:
                    break

        # ✅ FIX: Calculate discount_pct
        discount_pct = None
        if price and original_price and original_price > price:
            discount_pct = round((original_price - price) / original_price * 100)
        else:
            # Try to grab it from the badge directly
            disc_el = card.select_one(".a-letter-space") or card.select_one('[class*="savingsPercentage"]')
            if disc_el:
                m = re.search(r"(\d+)%", disc_el.get_text())
                if m:
                    discount_pct = int(m.group(1))

        # Rating
        rating_el = card.select_one(".a-icon-alt") or card.select_one('[aria-label*="out of 5"]')
        rating = _clean_rating(rating_el.get_text(strip=True) if rating_el else "")

        # Review count
        review_el = (
            card.select_one('[data-cy="reviews-block"] .a-size-base') or
            card.select_one(".a-size-base.s-underline-text") or
            card.select_one('[aria-label*="ratings"]')
        )
        review_count = _clean_reviews(review_el.get_text(strip=True) if review_el else "")

        # Image
        img_el = card.select_one("img.s-image") or card.select_one(".s-product-image-container img")
        image_url = img_el["src"] if img_el and img_el.get("src") else None

        # Prime badge
        prime = bool(card.select_one(".s-prime") or card.select_one('[aria-label="Amazon Prime"]'))

        # Out of stock
        oos = card.select_one(".s-color-base.s-size-mini")
        in_stock = not (oos and "unavailable" in oos.get_text(strip=True).lower())

        return AmazonProduct(
            title=title,
            price=price,
            original_price=original_price,
            discount_pct=discount_pct,
            rating=rating,
            review_count=review_count,
            image_url=image_url,
            product_url=product_url,
            asin=asin,
            sponsored=sponsored,
            prime=prime,
            in_stock=in_stock,
        )
    except Exception as e:
        logger.debug(f"Failed to parse card: {e}")
        return None


# ── Public API ────────────────────────────────────────────────────────────────
def search_amazon(query: str, max_results: int = 10, page: int = 1) -> list[dict]:
    """
    Search Amazon.in and return up to `max_results` products.
    Returns a list of dicts compatible with the SmartBuyr API schema.
    """
    params = {
        "k":    query,
        "ref":  "nb_sb_noss",
        "page": page,
        # ✅ FIX: REMOVED 'i': 'electronics' — this was the main bug causing
        #         0 results for any non-electronics query (frother, shoes, etc.)
        #         Amazon's category filter is too strict for a general search tool.
    }

    soup = _fetch(SEARCH_URL, params=params)
    if not soup:
        logger.error("Failed to fetch Amazon search results")
        return []

    # Amazon wraps results in divs with data-component-type="s-search-result"
    cards = soup.select('[data-component-type="s-search-result"]')
    if not cards:
        # Fallback: try the older selector
        cards = soup.select(".s-result-item[data-asin]")

    logger.info(f"Amazon: found {len(cards)} raw cards for '{query}'")

    results = []
    for card in cards:
        product = _parse_product_card(card)
        if product and product.price:
            results.append({
                "title":          product.title,
                "price":          product.price,
                "original_price": product.original_price,   # ✅ added
                "discount_pct":   product.discount_pct,     # ✅ added
                "rating":         product.rating,
                "review_count":   product.review_count,
                "image_url":      product.image_url,
                "product_url":    product.product_url,
                "asin":           product.asin,
                "sponsored":      product.sponsored,
                "prime":          product.prime,
                "in_stock":       product.in_stock,
                "source":         "amazon",
            })
        if len(results) >= max_results:
            break

    logger.info(f"Amazon search '{query}': returning {len(results)} results")
    return results
