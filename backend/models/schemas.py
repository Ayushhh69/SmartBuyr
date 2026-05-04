from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

# ── helpers ──────────────────────────────────────────────────────────────────
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


# ── Product ───────────────────────────────────────────────────────────────────
class SellerPrice(BaseModel):
    seller_id:   str
    seller_name: str
    price:       float
    url:         Optional[str] = None
    in_stock:    bool = True

class Product(BaseModel):
    id:              Optional[PyObjectId] = Field(alias="_id")
    name:            str
    description:     str
    category:        str
    brand:           str
    image_url:       Optional[str]
    current_price:   float
    lowest_price:    float
    highest_price:   float
    avg_rating:      float = 0.0
    review_count:    int   = 0
    seller_prices:   List[SellerPrice] = []
    tags:            List[str] = []
    created_at:      datetime = Field(default_factory=datetime.utcnow)
    updated_at:      datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ProductCreate(BaseModel):
    name:          str
    description:   str
    category:      str
    brand:         str
    image_url:     Optional[str] = None
    current_price: float
    tags:          List[str] = []

class ProductUpdate(BaseModel):
    name:          Optional[str]
    description:   Optional[str]
    current_price: Optional[float]
    image_url:     Optional[str]


# ── Price History ─────────────────────────────────────────────────────────────
class PriceHistory(BaseModel):
    id:         Optional[PyObjectId] = Field(alias="_id")
    product_id: str
    seller_id:  str
    seller_name: str
    price:      float
    timestamp:  datetime = Field(default_factory=datetime.utcnow)
    source:     str = "manual"   # manual | scraper | api

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PriceHistoryCreate(BaseModel):
    product_id:  str
    seller_id:   str
    seller_name: str
    price:       float
    source:      str = "manual"


# ── Review ────────────────────────────────────────────────────────────────────
class ReviewHelpful(BaseModel):
    yes: int = 0
    no:  int = 0

class Review(BaseModel):
    id:          Optional[PyObjectId] = Field(alias="_id")
    product_id:  str
    user_id:     str
    user_name:   str
    rating:      float              # 1–5
    title:       str
    body:        str
    pros:        List[str] = []
    cons:        List[str] = []
    verified:    bool = False
    helpful:     ReviewHelpful = ReviewHelpful()
    sentiment:   Optional[str] = None  # positive | neutral | negative
    created_at:  datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ReviewCreate(BaseModel):
    product_id: str
    user_id:    str
    user_name:  str
    rating:     float
    title:      str
    body:       str
    pros:       List[str] = []
    cons:       List[str] = []
    verified:   bool = False


# ── Price Alert ───────────────────────────────────────────────────────────────
class Alert(BaseModel):
    id:           Optional[PyObjectId] = Field(alias="_id")
    user_id:      str
    user_email:   str
    product_id:   str
    product_name: str
    target_price: float
    current_price_at_creation: float
    triggered:    bool = False
    triggered_at: Optional[datetime] = None
    created_at:   datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AlertCreate(BaseModel):
    user_id:      str
    user_email:   str
    product_id:   str
    target_price: float


# ── Seller ────────────────────────────────────────────────────────────────────
class Seller(BaseModel):
    id:          Optional[PyObjectId] = Field(alias="_id")
    name:        str
    website:     Optional[str]
    logo_url:    Optional[str]
    rating:      float = 0.0
    verified:    bool = False
    created_at:  datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
