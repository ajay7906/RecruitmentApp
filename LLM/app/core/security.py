
import hmac
import logging
from typing import Optional
from uuid import UUID

from fastapi import Header, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class InternalAuthContext(BaseModel):
    authenticated: bool = True
    company_id: Optional[UUID] = None
    actor_id: Optional[UUID] = None
    actor_role: Optional[str] = None


def verify_internal_request(
    x_internal_secret: Optional[str] = Header(
        default=None, alias="X-Internal-Secret"
    ),
    x_company_id: Optional[str] = Header(
        default=None, alias="X-Company-Id"
    ),
    x_actor_id: Optional[str] = Header(
        default=None, alias="X-Actor-Id"
    ),
    x_actor_role: Optional[str] = Header(
        default=None, alias="X-Actor-Role"
    ),
) -> InternalAuthContext:

    settings = get_settings()
    expected = settings.INTERNAL_API_SECRET or ""

    # Debug information (never print actual secrets)
    logger.info("========== INTERNAL AUTH DEBUG ==========")

    logger.info(
        "Received internal secret: %s",
        "PRESENT" if x_internal_secret else "MISSING"
    )

    logger.info(
        "Expected internal secret configured: %s",
        "YES" if expected else "NO"
    )

    logger.info(
        "Received secret length: %s",
        len(x_internal_secret) if x_internal_secret else 0
    )

    logger.info(
        "Expected secret length: %s",
        len(expected)
    )

    logger.info(
        "Secret matches: %s",
        bool(
            x_internal_secret
            and expected
            and hmac.compare_digest(
                x_internal_secret.encode("utf-8"),
                expected.encode("utf-8")
            )
        )
    )

    logger.info("Company ID received: %s", bool(x_company_id))
    logger.info("Actor ID received: %s", bool(x_actor_id))
    logger.info("Actor role received: %s", x_actor_role)

    logger.info("=========================================")

    if not x_internal_secret or not expected or not hmac.compare_digest(
        x_internal_secret.encode("utf-8"),
        expected.encode("utf-8")
    ):
        logger.error("Internal authentication failed")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_INTERNAL_SECRET",
                "message": "Unauthorized internal service request",
            },
        )

    parsed_company_id = None

    if x_company_id and x_company_id.strip():
        try:
            parsed_company_id = UUID(x_company_id.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_COMPANY_HEADER",
                    "message": "Invalid X-Company-Id UUID"
                },
            )

    parsed_actor_id = None

    if x_actor_id and x_actor_id.strip():
        try:
            parsed_actor_id = UUID(x_actor_id.strip())
        except ValueError:
            logger.warning("Invalid X-Actor-Id UUID received")
            parsed_actor_id = None

    logger.info("Internal authentication successful")

    return InternalAuthContext(
        authenticated=True,
        company_id=parsed_company_id,
        actor_id=parsed_actor_id,
        actor_role=x_actor_role,
    )
