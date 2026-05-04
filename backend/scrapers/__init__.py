# scrapers package
from .amazon   import search_amazon
from .flipkart import search_flipkart

__all__ = ["search_amazon", "search_flipkart"]
