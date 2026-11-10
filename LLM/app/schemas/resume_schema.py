from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ResumeProcessRequest(BaseModel):
    resume_id: UUID
    candidate_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    resume_version: Optional[int] = Field(default=None, ge=1)
    storage_key: Optional[str] = None
    file_type: Optional[str] = None
    content_base64: Optional[str] = None
    force_reprocess: bool = False
    async_execution: bool = True


class ResumeProcessResponse(BaseModel):
    success: bool = True
    resume_id: UUID
    candidate_id: UUID
    resume_version: int
    status: str
    content_hash: Optional[str] = None
    task_id: Optional[str] = None
    cached: bool = False
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class ResumeStatusResponse(BaseModel):
    success: bool = True
    resume_id: UUID
    candidate_id: UUID
    resume_version: int
    status: str
    content_hash: str
    page_count: int = 0
    is_scanned: bool = False
    ocr_used: bool = False
    retry_count: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    extracted_profile: Optional[Dict[str, Any]] = None
