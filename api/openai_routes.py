"""FastAPI router for OpenAI-compatible endpoints."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from .dependencies import require_api_key
from .models.anthropic import MessagesRequest
from .openai_translator import anthropic_stream_to_openai, openai_to_anthropic_request
from .routes import get_proxy_service
from .services import ClaudeProxyService

router = APIRouter()


@router.post("/v1/chat/completions")
async def chat_completions(
    request: Request,
    service: ClaudeProxyService = Depends(get_proxy_service),
    _auth=Depends(require_api_key),
):
    """Handle OpenAI-compatible chat completions requests."""
    openai_body = await request.json()

    anthropic_dict = openai_to_anthropic_request(openai_body)
    anthropic_request = MessagesRequest.model_validate(anthropic_dict)

    from typing import cast

    # We always stream, so the proxy service returns a StreamingResponse of Anthropic SSE
    response = service.create_message(anthropic_request, user=_auth)
    streaming_response = cast(StreamingResponse, response)

    # response.body_iterator is an AsyncIterator[str] or AsyncGenerator
    anthropic_stream = streaming_response.body_iterator

    # Wrap it in our OpenAI translator
    openai_stream = anthropic_stream_to_openai(
        anthropic_stream, openai_body.get("model", "default")
    )

    return StreamingResponse(openai_stream, media_type="text/event-stream")


@router.api_route("/v1/chat/completions", methods=["HEAD", "OPTIONS"])
async def probe_chat_completions(_auth=Depends(require_api_key)):
    """Respond to compatibility probes."""
    from fastapi import Response

    return Response(status_code=204, headers={"Allow": "POST, HEAD, OPTIONS"})
