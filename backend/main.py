from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import products, reviews, price_history, alerts, sellers, search
from database import connect_db, close_db

app = FastAPI(
    title="SmartBuyr API",
    description="E-Commerce Price Analysis & Review Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    # ✅ FIX: Added ports 5174 and 5175 — Vite picks whichever is free,
    #         so we allow the full typical range.
    allow_origins=[
        "https://smart-buyr-vssa.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await close_db()

app.include_router(products.router,      prefix="/api/products",      tags=["Products"])
app.include_router(reviews.router,       prefix="/api/reviews",        tags=["Reviews"])
app.include_router(price_history.router, prefix="/api/price-history",  tags=["Price History"])
app.include_router(alerts.router,        prefix="/api/alerts",         tags=["Alerts"])
app.include_router(sellers.router,       prefix="/api/sellers",        tags=["Sellers"])
app.include_router(search.router,        prefix="/api/search",         tags=["Live Search"])

@app.get("/")
async def root():
    return {"message": "SmartBuyr API is running", "version": "1.0.0"}
