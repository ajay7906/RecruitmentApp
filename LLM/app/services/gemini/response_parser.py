import json
import re
from typing import Type, TypeVar
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


class InvalidGeminiResponseError(Exception):
    pass


class ResponseParser:
    """
    Extracts JSON from Gemini text responses (handling optional markdown code fences)
    and validates against a strict Pydantic model.
    """

    @staticmethod
    def extract_json_str(raw_text: str) -> str:
        if not raw_text or not str(raw_text).strip():
            raise InvalidGeminiResponseError("Empty response from Gemini")

        text = str(raw_text).strip()
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if fence_match:
            text = fence_match.group(1).strip()

        start_idx = text.find("{")
        end_idx = text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            return text[start_idx : end_idx + 1]

        raise InvalidGeminiResponseError("No JSON object found in Gemini response")

    @classmethod
    def parse_and_validate(cls, raw_text: str, schema_cls: Type[T]) -> T:
        json_str = cls.extract_json_str(raw_text)
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as exc:
            raise InvalidGeminiResponseError(f"Invalid JSON syntax: {exc}") from exc

        try:
            return schema_cls.model_validate(parsed)
        except ValidationError as exc:
            raise InvalidGeminiResponseError(f"Pydantic schema validation failed: {exc}") from exc
