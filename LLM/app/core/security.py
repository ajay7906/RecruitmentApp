import hmac
from typing import Optional
from uuid import UUID
from fastapi import Header, HTTPException, status
from pydantic import BaseModel
from app.core.config import get_settings


class InternalAuthContext(BaseModel):
    authenticated: bool = True
    company_id: Optional[UUID] = None
    actor_id: Optional[UUID] = None
    actor_role: Optional[str] = None


def verify_internal_request(
    x_internal_secret: Optional[str] = Header(default=None, alias="X-Internal-Secret"),
    x_company_id: Optional[str] = Header(default=None, alias="X-Company-Id"),
    x_actor_id: Optional[str] = Header(default=None, alias="X-Actor-Id"),
    x_actor_role: Optional[str] = Header(default=None, alias="X-Actor-Role"),
) -> InternalAuthContext:
    """
    Validates service-to-service communication between Node.js and Python.
    Uses constant-time HMAC comparison to prevent timing side-channel attacks.
    """
    settings = get_settings()
    expected = settings.INTERNAL_API_SECRET or ""

    if not x_internal_secret or not hmac.compare_digest(
        x_internal_secret.encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_INTERNAL_SECRET",
                "message": "Unauthorized internal service request",
            },
        )

    parsed_company_id: Optional[UUID] = None
    if x_company_id and x_company_id.strip():
        try:
            parsed_company_id = UUID(x_company_id.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_COMPANY_HEADER", "message": "Invalid X-Company-Id UUID"},
            )

    parsed_actor_id: Optional[UUID] = None
    if x_actor_id and x_actor_id.strip():
        try:
            parsed_actor_id = UUID(x_actor_id.strip())
        except ValueError:
            parsed_actor_id = None

    return InternalAuthContext(
        authenticated=True,
        company_id=parsed_company_id,
        actor_id=parsed_actor_id,
        actor_role=x_actor_role,
    )
