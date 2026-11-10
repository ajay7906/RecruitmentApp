import hashlib
import math
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar
from uuid import UUID
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.logging import logger
from app.services.gemini.response_parser import InvalidGeminiResponseError, ResponseParser
from app.services.gemini.usage_tracker import AIBudgetExceededError, UsageTracker

T = TypeVar("T", bound=BaseModel)


class GeminiServiceError(RuntimeError):
    """Raised when Gemini generation or embedding fails."""


TokenBudgetExceededError = AIBudgetExceededError



class GeminiClient:
    """
    Centralized gateway for all Google Gemini API interactions (LLM + Embeddings).
    - Supports pluggable mock/test handlers so automated tests never consume real API credits.
    - Enforces concurrency semaphores, exponential backoff retries, timeouts, and token budgets.
    - Logs every request to `ai.ai_usage_logs`.
    """

    def __init__(self) -> None:
        self._custom_generate_fn: Optional[Callable[[str, str], Dict[str, Any]]] = None
        self._custom_embed_fn: Optional[Callable[[List[str], str, int], List[List[float]]]] = None
        self._semaphore = threading.BoundedSemaphore(get_settings().GEMINI_MAX_CONCURRENCY)

    def set_custom_handlers(
        self,
        *,
        generate_fn: Optional[Callable[[str, str], Dict[str, Any]]] = None,
        embed_fn: Optional[Callable[[List[str], str, int], List[List[float]]]] = None,
    ) -> None:
        self._custom_generate_fn = generate_fn
        self._custom_embed_fn = embed_fn

    @property
    def is_configured(self) -> bool:
        settings = get_settings()
        return bool(self._custom_generate_fn is not None or settings.GEMINI_API_KEY)


    @staticmethod
    def estimate_tokens(text: str) -> int:
        if not text:
            return 1
        return max(1, len(text) // 4)

    @staticmethod
    def deterministic_local_embedding(text: str, dimension: int = 768) -> List[float]:
        """
        Generates a unit-normalized, token-overlapping semantic vector when running
        in offline/test environments without an external GEMINI_API_KEY, or when
        invoked by the default local fallback. Texts sharing domain tokens produce
        high cosine similarity in pgvector.
        """
        vec = [0.0] * dimension
        tokens = [
            tok.strip(".,;:()[]{}\"'/-").lower()
            for tok in (text or "").split()
            if len(tok.strip(".,;:()[]{}\"'/-")) >= 2
        ]
        if not tokens:
            vec[0] = 1.0
            return vec

        for tok in tokens:
            digest = hashlib.sha256(tok.encode("utf-8")).digest()
            # Project each token into 4 coordinates with signed weights (SimHash / feature hashing)
            for i in range(4):
                idx = int.from_bytes(digest[i * 4 : (i + 1) * 4], "little") % dimension
                sign = 1.0 if (digest[16 + i] & 1) == 0 else -1.0
                vec[idx] += sign

        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [round(v / norm, 6) for v in vec]
        else:
            vec[0] = 1.0
        return vec

    def generate_embeddings(
        self,
        db: Session,
        texts: List[str],
        *,
        company_id: Optional[UUID] = None,
        job_id: Optional[UUID] = None,
        candidate_id: Optional[UUID] = None,
    ) -> List[List[float]]:
        settings = get_settings()
        model_name = settings.GEMINI_EMBEDDING_MODEL
        dim = settings.EMBEDDING_DIMENSION

        if not texts:
            return []

        UsageTracker.check_budget_available(db, company_id=company_id)

        start_ts = time.perf_counter()
        input_tokens = sum(self.estimate_tokens(t) for t in texts)

        last_err: Optional[Exception] = None
        for attempt in range(1, settings.GEMINI_MAX_RETRIES + 1):
            try:
                with self._semaphore:
                    if self._custom_embed_fn is not None:
                        vectors = self._custom_embed_fn(texts, model_name, dim)
                    elif settings.GEMINI_API_KEY and settings.APP_ENV != "test":
                        from google import genai
                        from google.genai import types

                        client = genai.Client(api_key=settings.GEMINI_API_KEY)
                        resp = client.models.embed_content(
                            model=model_name,
                            contents=texts,
                            config=types.EmbedContentConfig(output_dimensionality=dim),
                        )
                        vectors = [list(e.values) for e in resp.embeddings]
                    else:
                        vectors = [self.deterministic_local_embedding(t, dim) for t in texts]

                # Validate vector dimensions
                normalized_vectors: List[List[float]] = []
                for vec in vectors:
                    if len(vec) != dim:
                        raise ValueError(
                            f"Embedding dimension mismatch: expected {dim}, got {len(vec)}"
                        )
                    normalized_vectors.append([float(x) for x in vec])

                latency_ms = int((time.perf_counter() - start_ts) * 1000)
                UsageTracker.record_usage(
                    db,
                    request_type="EMBEDDING",
                    model_name=model_name,
                    input_tokens=input_tokens,
                    output_tokens=0,
                    latency_ms=latency_ms,
                    company_id=company_id,
                    job_id=job_id,
                    candidate_id=candidate_id,
                    status="SUCCESS",
                )
                return normalized_vectors

            except AIBudgetExceededError:
                raise
            except ValueError:
                raise
            except Exception as exc:
                last_err = exc
                logger.warning(
                    "Gemini embedding attempt %d/%d failed: %s",
                    attempt,
                    settings.GEMINI_MAX_RETRIES,
                    exc,
                )
                if attempt < settings.GEMINI_MAX_RETRIES:
                    time.sleep(min(2.0, 0.15 * (2 ** (attempt - 1))))

        latency_ms = int((time.perf_counter() - start_ts) * 1000)
        UsageTracker.record_usage(
            db,
            request_type="EMBEDDING",
            model_name=model_name,
            input_tokens=input_tokens,
            output_tokens=0,
            latency_ms=latency_ms,
            company_id=company_id,
            job_id=job_id,
            candidate_id=candidate_id,
            status="FAILED",
            error_message=str(last_err),
        )
        raise RuntimeError(f"Embedding generation failed after retries: {last_err}") from last_err

    def generate_structured_json(
        self,
        db: Session,
        *,
        prompt: str,
        schema_cls: Type[T],
        request_type: str,
        company_id: Optional[UUID] = None,
        job_id: Optional[UUID] = None,
        candidate_id: Optional[UUID] = None,
    ) -> T:
        settings = get_settings()
        model_name = settings.GEMINI_MODEL

        UsageTracker.check_budget_available(db, company_id=company_id)

        start_ts = time.perf_counter()
        est_input_tokens = self.estimate_tokens(prompt)
        last_err: Optional[Exception] = None

        for attempt in range(1, settings.GEMINI_MAX_RETRIES + 1):
            try:
                with self._semaphore:
                    if self._custom_generate_fn is not None:
                        raw_resp = self._custom_generate_fn(prompt, model_name)
                        raw_text = (
                            raw_resp.get("text")
                            if isinstance(raw_resp, dict)
                            else str(raw_resp)
                        )
                        in_tok = (
                            raw_resp.get("input_tokens", est_input_tokens)
                            if isinstance(raw_resp, dict)
                            else est_input_tokens
                        )
                        out_tok = (
                            raw_resp.get("output_tokens", self.estimate_tokens(raw_text))
                            if isinstance(raw_resp, dict)
                            else self.estimate_tokens(raw_text)
                        )
                    elif settings.GEMINI_API_KEY and settings.APP_ENV != "test":
                        from google import genai
                        from google.genai import types

                        client = genai.Client(api_key=settings.GEMINI_API_KEY)
                        response = client.models.generate_content(
                            model=model_name,
                            contents=prompt,
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                temperature=0.1,
                            ),
                        )
                        raw_text = response.text or ""
                        usage_meta = getattr(response, "usage_metadata", None)
                        in_tok = getattr(usage_meta, "prompt_token_count", None) or est_input_tokens
                        out_tok = getattr(usage_meta, "candidates_token_count", None) or self.estimate_tokens(raw_text)
                    else:
                        raise RuntimeError(
                            "No custom Gemini handler or GEMINI_API_KEY configured for live LLM generation."
                        )

                validated = ResponseParser.parse_and_validate(raw_text, schema_cls)
                latency_ms = int((time.perf_counter() - start_ts) * 1000)

                UsageTracker.record_usage(
                    db,
                    request_type=request_type,
                    model_name=model_name,
                    input_tokens=in_tok,
                    output_tokens=out_tok,
                    latency_ms=latency_ms,
                    company_id=company_id,
                    job_id=job_id,
                    candidate_id=candidate_id,
                    status="SUCCESS",
                )
                return validated

            except AIBudgetExceededError:
                raise
            except (InvalidGeminiResponseError, Exception) as exc:
                last_err = exc
                logger.warning(
                    "Gemini structured generation attempt %d/%d failed: %s",
                    attempt,
                    settings.GEMINI_MAX_RETRIES,
                    exc,
                )
                if attempt < settings.GEMINI_MAX_RETRIES:
                    time.sleep(min(2.0, 0.15 * (2 ** (attempt - 1))))

        latency_ms = int((time.perf_counter() - start_ts) * 1000)
        UsageTracker.record_usage(
            db,
            request_type=request_type,
            model_name=model_name,
            input_tokens=est_input_tokens,
            output_tokens=0,
            latency_ms=latency_ms,
            company_id=company_id,
            job_id=job_id,
            candidate_id=candidate_id,
            status="FAILED",
            error_message=str(last_err),
        )
        raise GeminiServiceError(f"Gemini generation failed after retries: {last_err}") from last_err

    def generate_structured(
        self,
        db: Session,
        *,
        operation_type: str,
        prompt: str,
        schema: Type[T],
        system_instruction: Optional[str] = None,
        company_id: Optional[UUID] = None,
        job_id: Optional[UUID] = None,
        candidate_id: Optional[UUID] = None,
    ) -> T:
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
        return self.generate_structured_json(
            db,
            prompt=full_prompt,
            schema_cls=schema,
            request_type=operation_type,
            company_id=company_id,
            job_id=job_id,
            candidate_id=candidate_id,
        )


gemini_client = GeminiClient()

