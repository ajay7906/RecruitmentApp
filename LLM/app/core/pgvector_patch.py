import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def apply_pgvector_patch() -> None:
    """
    Patches `pgvector.vector.Vector._from_db` and `pgvector.sqlalchemy.VECTOR.result_processor`
    to safely handle vector values that drivers (such as psycopg 3) return as Python `list`
    objects rather than raw strings or Vector instances.

    Without this patch, `Vector._from_db` calls `_from_text(value)` on Python lists,
    causing:
        AttributeError: 'list' object has no attribute 'split'
    """
    try:
        from pgvector.vector import Vector
        from pgvector.sqlalchemy import VECTOR

        def _safe_from_db(cls: Any, value: Any) -> Optional[list[float]]:
            if value is None:
                return None
            if isinstance(value, Vector):
                return value.to_list()
            if isinstance(value, (list, tuple)):
                return [float(v) for v in value]
            if hasattr(value, "tolist"):
                return [float(v) for v in value.tolist()]
            if isinstance(value, str):
                return cls._from_text(value)
            return [float(v) for v in value]

        Vector._from_db = classmethod(_safe_from_db)

        def _safe_result_processor(self: Any, dialect: Any, coltype: Any) -> Any:
            def process(value: Any) -> Optional[list[float]]:
                return Vector._from_db(value)
            return process

        VECTOR.result_processor = _safe_result_processor
        logger.debug("Successfully applied pgvector psycopg compatibility patch")
    except Exception as exc:
        logger.warning(f"Failed to apply pgvector compatibility patch: {exc}")


# Apply automatically on module import
apply_pgvector_patch()
