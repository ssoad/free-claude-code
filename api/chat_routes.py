import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db import get_db
from api.dependencies import get_current_user
from api.user_models import ChatMessage, ChatSession, User

router = APIRouter(prefix="/api/chat", tags=["chat"])


# Pydantic Schemas
class SessionCreate(BaseModel):
    title: str = "New Chat"


class SessionUpdate(BaseModel):
    title: str


class SessionResponse(BaseModel):
    id: int
    title: str
    updated_at: str

    class Config:
        from_attributes = True


class MessageSyncRequest(BaseModel):
    messages: list[dict[str, Any]]


class MessageResponse(BaseModel):
    role: str
    content: Any


@router.post("/sessions", response_model=SessionResponse)
def create_session(
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title=data.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "updated_at": session.updated_at.isoformat(),
    }


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == current_user.id)
            .order_by(ChatSession.updated_at.desc())
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}", response_model=list[MessageResponse])
def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        .scalars()
        .all()
    )

    result = []
    for m in messages:
        try:
            content = json.loads(m.content)
        except json.JSONDecodeError:
            content = m.content
        result.append({"role": m.role, "content": content})

    return result


@router.put("/sessions/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: int,
    data: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    session.title = data.title
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "updated_at": session.updated_at.isoformat(),
    }


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()
    return None


@router.put("/sessions/{session_id}/messages")
def sync_session_messages(
    session_id: int,
    data: MessageSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    # Clear existing messages for this session
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()

    # Create new messages
    new_messages = []
    for msg in data.messages:
        content_str = json.dumps(msg.get("content", ""))
        new_messages.append(
            ChatMessage(
                session_id=session_id,
                role=msg.get("role", "user"),
                content=content_str,
            )
        )

    db.add_all(new_messages)
    db.commit()

    return {"status": "ok", "synced_count": len(new_messages)}
