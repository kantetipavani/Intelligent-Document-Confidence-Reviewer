from typing import Dict, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai_service import ai_service

router = APIRouter(
    prefix="/ai",
    tags=["AI Assistant"]
)


class ChatRequest(BaseModel):
    message: str
    page: Optional[str] = ""
    document_text: Optional[str] = ""
    confidence_data: Optional[Dict] = {}


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):

    reply = ai_service.chat(
        message=request.message,
        page=request.page,
        document_text=request.document_text,
        confidence_data=request.confidence_data,
    )

    return ChatResponse(reply=reply)


@router.get("/suggestions")
async def suggestions():
    return {
        "questions": ai_service.suggested_questions()
    }