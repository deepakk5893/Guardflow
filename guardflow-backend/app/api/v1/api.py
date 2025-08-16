from fastapi import APIRouter

from app.api.v1 import auth, proxy, admin, users, chat, alerts, llm_providers, super_admin, invitations, user_management, api_keys

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(proxy.router, prefix="/chat", tags=["proxy"])
api_router.include_router(chat.router, prefix="/chats", tags=["chat"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(alerts.router, prefix="/admin/alerts", tags=["alerts"])
api_router.include_router(users.router, prefix="/user", tags=["user"])

# Multi-tenant routes
api_router.include_router(super_admin.router, prefix="/super-admin", tags=["super-admin"])
api_router.include_router(llm_providers.router, prefix="/admin/llm-providers", tags=["llm-providers"])

# Invitation and user management routes
api_router.include_router(invitations.router, prefix="/admin/invitations", tags=["invitations"])
api_router.include_router(user_management.router, prefix="/admin", tags=["user-management"])

# API Key management routes  
api_router.include_router(api_keys.router, prefix="/auth/api-keys", tags=["api-keys"])

# Public invitation routes (no auth required) - only specific endpoints
from fastapi import APIRouter as PublicRouter
public_invitation_router = PublicRouter()
public_invitation_router.add_api_route("/public/{token}/details", invitations.get_invitation_details, methods=["GET"])
public_invitation_router.add_api_route("/public/{token}/accept", invitations.accept_invitation, methods=["POST"])

api_router.include_router(public_invitation_router, prefix="/invitations", tags=["public-invitations"])

# uvicorn app.main:app --reload