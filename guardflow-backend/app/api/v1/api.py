from fastapi import APIRouter

from app.api.v1 import auth, proxy, admin, users

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(proxy.router, prefix="/chat", tags=["proxy"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(users.router, prefix="/user", tags=["user"])

# uvicorn app.main:app --reload