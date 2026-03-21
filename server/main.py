from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.products import router as products_router
from routers.sales import router as sales_router

app = FastAPI(title="InvenSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router, prefix="/api")
app.include_router(sales_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "InvenSight API is running"}
