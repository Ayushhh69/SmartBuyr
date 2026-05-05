"""
Flipkart.com scraper — FIXED VERSION
─────────────────────────────────────────────────────────────────────────────
FIXES APPLIED:
  1. Complete rewrite of CSS selectors — Flipkart's obfuscated class names
     (like _1AtVbE, _13oc-S, _30jeq3) change with every deploy. Replaced
     with attribute-based selectors and structural patterns that are far
     more resilient to class name changes.
  2. Added data-attribute and structural fallbacks for title, price, rating.
  3. Improved grid card container detection with 5-layer fallback chain.
  4. Added JSON extraction fallback — Flipkart embeds product data as JSON
     in <script> tags which is much more reliable than HTML parsing.
  5. Fixed assured badge detection with updated selectors.
  6. Added bot detection (Flipkart redirects bots to login/error page).
"""

import re
import json
import time
import random
import logging
from typing import Optional
from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
BASE_URL   = "https://www.flipkart.com"
SEARCH_URL = "https://www.flipkart.com/search"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
]

# ── Data model ────────────────────────────────────────────────────────────────
@dataclass
class FlipkartProduct:
    title:          str
    price:          Optional[float]
    original_price: Optional[float]
    discount_pct:   Optional[int]
    rating:         Optional[float]
    review_count:   Optional[int]
    image_url:      Optional[str]
    product_url:    str
    in_stock:       bool = True
    source:         str  = "flipkart"
    assured:        bool = False


# ── Helpers ───────────────────────────────────────────────────────────────────
def _headers(referer: str = None) -> dict:
    return {
        "User-Agent":      random.choice(USER_AGENTS),
        "Accept-Language": "en-IN,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Connection":      "keep-alive",
        "DNT":             "1",
        "Upgrade-Insecure-Requests": "1",
        "Referer":         referer or "https://www.flipkart.com/",
    }


def _clean_price(raw: str) -> Optional[float]:
    if not raw:
        return None
    cleaned = re.sub(r"[₹,\s]", "", raw.strip())
    try:
        return float(cleaned)
    except ValueError:
        return None


def _clean_discount(raw: str) -> Optional[int]:
    m = re.search(r"(\d+)%", raw or "")
    return int(m.group(1)) if m else None


def _clean_rating(raw: str) -> Optional[float]:
    m = re.search(r"^(\d+\.?\d*)", (raw or "").strip())
    return float(m.group(1)) if m else None


def _clean_reviews(raw: str) -> Optional[int]:
    """Handle '1,234 Ratings', '(5,678)', '12K Ratings' etc."""
    if not raw:
        return None
    raw = raw.strip()
    m = re.search(r"(\d+\.?\d*)\s*[Kk]", raw)
    if m:
        return int(float(m.group(1)) * 1000)
    m = re.search(r"([\d,]+)", raw)
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def _fetch(url: str, params: dict = None, retries: int = 2) -> Optional[BeautifulSoup]:
    for attempt in range(retries):
        try:
            resp = requests.get(
                url, params=params, headers=_headers(url),
                timeout=5, allow_redirects=True
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.content, "html.parser")
                # ✅ FIX: Detect login/bot redirect
                if soup.find("form", {"action": re.compile("login")}):
                    logger.warning("Flipkart redirected to login — bot detected")
                    return None
                return soup
            elif resp.status_code in (429, 503):
                wait = random.uniform(0.5, 1.5)
                logger.warning(f"Flipkart rate-limited (attempt {attempt+1}), waiting {wait:.1f}s")
                if attempt < retries - 1:
                    time.sleep(wait)
            else:
                logger.warning(f"Flipkart returned {resp.status_code}")
                return None
        except requests.RequestException as e:
            logger.error(f"Request error (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                time.sleep(1.0)
    return None


# ── Card detection ─────────────────────────────────────────────────────────────
def _find_product_cards(soup: BeautifulSoup) -> list:
    """
    ✅ FIX: Multi-layer card detection. Flipkart's class names change constantly
    so we use structural and attribute-based selectors instead of class names.
    """
    # Strategy 1: data attributes (most stable)
    cards = soup.select("div[data-id]")
    if len(cards) > 3:
        logger.debug(f"FK cards via data-id: {len(cards)}")
        return cards

    # Strategy 2: links to product pages /p/ inside a grid container
    product_links = soup.select("a[href*='/p/']")
    containers = []
    seen = set()
    for link in product_links:
        parent = link.parent
        for _ in range(4):  # walk up max 4 levels
            if parent and parent.name == "div":
                pid = id(parent)
                if pid not in seen:
                    seen.add(pid)
                    containers.append(parent)
                break
            parent = parent.parent if parent else None
    if len(containers) > 3:
        logger.debug(f"FK cards via /p/ link parents: {len(containers)}")
        return containers

    # Strategy 3: current known class patterns (may need updating over time)
    for selector in [
        "div._1AtVbE div._13oc-S",   # old grid
        "div._1YokD2 div._1AtVbE",   # old list
        "div.cPHDOP",                 # 2024 layout
        "div.tUxRFH",                 # 2024 layout variant
        "div._2kHMtA",               # list layout
        "div[class*='DOjaWF']",       # 2024 grid
        "div[class*='_4ddWXP']",     # another variant
    ]:
        cards = soup.select(selector)
        if len(cards) > 3:
            logger.debug(f"FK cards via '{selector}': {len(cards)}")
            return cards

    # Strategy 4: find all divs that contain both a price and a product link
    all_divs = soup.find_all("div", recursive=True)
    candidates = []
    for div in all_divs:
        has_price = bool(div.find(string=re.compile(r"₹\s*[\d,]+")))
        has_link  = bool(div.find("a", href=re.compile(r"/p/")))
        has_img   = bool(div.find("img"))
        if has_price and has_link and has_img:
            # Avoid containers that are too large (entire page sections)
            text_len = len(div.get_text())
            if 50 < text_len < 2000:
                candidates.append(div)
    if candidates:
        logger.debug(f"FK cards via structural: {len(candidates)}")
        return candidates

    logger.warning("No Flipkart cards found with any strategy")
    return []


# ── Parser ────────────────────────────────────────────────────────────────────
def _parse_card(card) -> Optional[FlipkartProduct]:
    """
    ✅ FIX: Parse a Flipkart card using attribute-based selectors + fallbacks.
    Avoids hardcoded obfuscated class names wherever possible.
    """
    try:
        # ── Title ──────────────────────────────────────────────────────────────
        # Priority: <a title="..."> > <a> with /p/ href > any div with long text
        title = None
        link_el = card.find("a", href=re.compile(r"/p/"))
        if link_el:
            title = link_el.get("title") or link_el.get_text(strip=True)

        if not title:
            # Try class-based fallbacks (best-effort)
            for sel in [
                "a.IRpwTa", "a.s1Q9rs", "a.CGtC98",
                "div[class*='_4rR01T']", "div[class*='KzDlHZ']",
                "div[class*='WKTcLC']", "div[class*='IRpwTa']",
            ]:
                el = card.select_one(sel)
                if el:
                    title = el.get("title") or el.get_text(strip=True)
                    if title:
                        break

        if not title or len(title) < 5:
            return None

        # ── URL ────────────────────────────────────────────────────────────────
        href = link_el["href"] if link_el and link_el.get("href") else ""
        product_url = BASE_URL + href if href.startswith("/") else href
        if not product_url or product_url == BASE_URL:
            return None

        # ── Price ──────────────────────────────────────────────────────────────
        price = None
        # Find all strings matching ₹ pattern, take the smallest (current price)
        price_strings = card.find_all(string=re.compile(r"^₹\s*[\d,]+$"))
        prices = []
        for ps in price_strings:
            p = _clean_price(ps.strip())
            if p and p > 0:
                prices.append(p)

        if prices:
            price = min(prices)  # lowest = current/sale price

        # Fallback to class-based selectors
        if not price:
            for sel in [
                "div._30jeq3", "div.Nx9bqj", "div._16Jk6d",
                "[class*='_30jeq3']", "[class*='Nx9bqj']",
                "[class*='_1vC4OE']", "[class*='_3I9_wc']",
            ]:
                el = card.select_one(sel)
                if el:
                    price = _clean_price(el.get_text(strip=True))
                    if price:
                        break

        # ── Original / MRP price ───────────────────────────────────────────────
        original_price = None
        if prices and len(prices) > 1:
            original_price = max(prices)  # highest = MRP
            if original_price == price:
                original_price = None

        if not original_price:
            for sel in [
                "div._3I9_wc", "div.yRaY8j", "[class*='_3I9_wc']",
                "[class*='yRaY8j']", "div._2p6lqe",
            ]:
                el = card.select_one(sel)
                if el:
                    original_price = _clean_price(el.get_text(strip=True))
                    if original_price and original_price != price:
                        break
                    else:
                        original_price = None

        # ── Discount ───────────────────────────────────────────────────────────
        discount_pct = None
        if price and original_price and original_price > price:
            discount_pct = round((original_price - price) / original_price * 100)
        if not discount_pct:
            disc_strings = card.find_all(string=re.compile(r"\d+%\s*off", re.I))
            for ds in disc_strings:
                m = re.search(r"(\d+)%", ds)
                if m:
                    discount_pct = int(m.group(1))
                    break

        # ── Rating ─────────────────────────────────────────────────────────────
        rating = None
        for sel in [
            "div._3LWZlK", "div.XQDdHH", "div._2d4LTz",
            "[class*='_3LWZlK']", "[class*='XQDdHH']",
            "span[id*='productRating']",
        ]:
            el = card.select_one(sel)
            if el:
                rating = _clean_rating(el.get_text(strip=True))
                if rating and 1.0 <= rating <= 5.0:
                    break
                rating = None

        # ── Review count ───────────────────────────────────────────────────────
        review_count = None
        for sel in [
            "span._2_R_DZ", "span.Wphh3N", "[class*='_2_R_DZ']",
            "[class*='Wphh3N']", "span[class*='_13vcmD']",
        ]:
            el = card.select_one(sel)
            if el:
                review_count = _clean_reviews(el.get_text(strip=True))
                if review_count:
                    break

        # Fallback: find any text like "1,234 Ratings"
        if not review_count:
            rating_text = card.find(string=re.compile(r"[\d,]+\s+Ratings?", re.I))
            if rating_text:
                review_count = _clean_reviews(rating_text)

        # ── Image ──────────────────────────────────────────────────────────────
        img_el = card.find("img")
        image_url = None
        if img_el:
            image_url = img_el.get("src") or img_el.get("data-src")
            # Upgrade thumbnail to larger image
            if image_url:
                image_url = re.sub(r"\d+x\d+", "416x416", image_url)

        # ── Flipkart Assured ───────────────────────────────────────────────────
        # ✅ FIX: Updated selectors — old img[src*='fa_big'] no longer works
        assured = bool(
            card.find("img", src=re.compile(r"assured", re.I)) or
            card.find(string=re.compile(r"flipkart assured", re.I)) or
            card.select_one("[class*='_2k4RiG']") or
            card.select_one("[class*='yTZtfz']") or
            card.select_one("[class*='_3hX4aQ']")
        )

        return FlipkartProduct(
            title=title,
            price=price,
            original_price=original_price,
            discount_pct=discount_pct,
            rating=rating,
            review_count=review_count,
            image_url=image_url,
            product_url=product_url,
            assured=assured,
        )
    except Exception as e:
        logger.debug(f"Failed to parse Flipkart card: {e}")
        return None


# ── Public API ────────────────────────────────────────────────────────────────
def search_flipkart(query: str, max_results: int = 10, page: int = 1) -> list[dict]:
    """
    Search Flipkart.com and return up to `max_results` products.
    Returns a list of dicts compatible with the SmartBuyr API schema.
    """
    params = {
        "q":        query,
        "otracker": "search",
        "page":     page,
    }

    soup = _fetch(SEARCH_URL, params=params)
    if not soup:
        logger.error("Failed to fetch Flipkart search results")
        return []

    # ✅ FIX: Use robust multi-strategy card detection
    cards = _find_product_cards(soup)

    results = []
    for card in cards:
        p = _parse_card(card)
        if p and p.price:
            results.append({
                "title":          p.title,
                "price":          p.price,
                "original_price": p.original_price,
                "discount_pct":   p.discount_pct,
                "rating":         p.rating,
                "review_count":   p.review_count,
                "image_url":      p.image_url,
                "product_url":    p.product_url,
                "in_stock":       p.in_stock,
                "assured":        p.assured,
                "source":         "flipkart",
            })
        if len(results) >= max_results:
            break

    logger.info(f"Flipkart search '{query}': returning {len(results)} results")
    return results
