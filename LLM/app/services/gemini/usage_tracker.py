from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Optional
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models.ai_usage import AIUsageLog


class AIBudgetExceededError(Exception):
    def __init__(self, message: str, period: str = "DAILY"):
        super().__init__(message)
        self.period = period
        self.code = f"AI_{period}_BUDGET_EXCEEDED"


class UsageTracker:
    """
    Tracks Gemini LLM and Embedding token consumption, calculates estimated USD costs,
    and enforces configurable daily and monthly per-company token budgets.
    """

    @staticmethod
    def calculate_cost_usd(
        request_type: str, input_tokens: int, output_tokens: int
    ) -> Decimal:
        settings = get_settings()
        if request_type == "EMBEDDING":
            cost = (input_tokens / 1_000_000.0) * settings.GEMINI_EMBEDDING_PRICE_PER_1M
        else:
            cost = (
                (input_tokens / 1_000_000.0) * settings.GEMINI_INPUT_PRICE_PER_1M
                + (output_tokens / 1_000_000.0) * settings.GEMINI_OUTPUT_PRICE_PER_1M
            )
        return Decimal(f"{cost:.6f}")

    @classmethod
    def check_budget_available(
        cls, db: Session, company_id: Optional[UUID] = None
    ) -> Dict[str, int]:
        settings = get_settings()
        now = datetime.now(timezone.utc)
        day_start = now - timedelta(days=1)
        month_start = now - timedelta(days=30)

        daily_q = db.query(func.coalesce(func.sum(AIUsageLog.total_tokens), 0)).filter(
            AIUsageLog.created_at >= day_start,
            AIUsageLog.status == "SUCCESS",
        )
        monthly_q = db.query(func.coalesce(func.sum(AIUsageLog.total_tokens), 0)).filter(
            AIUsageLog.created_at >= month_start,
            AIUsageLog.status == "SUCCESS",
        )
        if company_id:
            daily_q = daily_q.filter(AIUsageLog.company_id == company_id)
            monthly_q = monthly_q.filter(AIUsageLog.company_id == company_id)

        daily_used = int(daily_q.scalar() or 0)
        monthly_used = int(monthly_q.scalar() or 0)

        if settings.AI_DAILY_BUDGET > 0 and daily_used >= settings.AI_DAILY_BUDGET:
            raise AIBudgetExceededError(
                f"Daily AI token budget ({settings.AI_DAILY_BUDGET}) reached ({daily_used} used).",
                period="DAILY",
            )
        if settings.AI_MONTHLY_BUDGET > 0 and monthly_used >= settings.AI_MONTHLY_BUDGET:
            raise AIBudgetExceededError(
                f"Monthly AI token budget ({settings.AI_MONTHLY_BUDGET}) reached ({monthly_used} used).",
                period="MONTHLY",
            )

        return {"daily_used": daily_used, "monthly_used": monthly_used}

    @classmethod
    def record_usage(
        cls,
        db: Session,
        *,
        request_type: str,
        model_name: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        latency_ms: int = 0,
        company_id: Optional[UUID] = None,
        job_id: Optional[UUID] = None,
        candidate_id: Optional[UUID] = None,
        cached_hit: bool = False,
        status: str = "SUCCESS",
        error_message: Optional[str] = None,
    ) -> AIUsageLog:
        total_tokens = max(0, int(input_tokens)) + max(0, int(output_tokens))
        cost = (
            Decimal("0.000000")
            if cached_hit or status != "SUCCESS"
            else cls.calculate_cost_usd(request_type, input_tokens, output_tokens)
        )
        entry = AIUsageLog(
            company_id=company_id,
            job_id=job_id,
            candidate_id=candidate_id,
            request_type=request_type,
            model_name=model_name,
            input_tokens=max(0, int(input_tokens)),
            output_tokens=max(0, int(output_tokens)),
            total_tokens=total_tokens,
            estimated_cost_usd=cost,
            latency_ms=max(0, int(latency_ms)),
            cached_hit=bool(cached_hit),
            status=status,
            error_message=error_message[:1000] if error_message else None,
        )
        db.add(entry)
        db.flush()
        return entry
