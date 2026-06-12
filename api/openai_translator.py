"""OpenAI format translation for the frontend endpoint."""

import json
import time
import uuid
from collections.abc import AsyncIterator
from typing import Any


def openai_to_anthropic_request(openai_body: dict[str, Any]) -> dict[str, Any]:
    """Translate an incoming OpenAI chat completion request to Anthropic MessagesRequest format."""
    anthropic_req: dict[str, Any] = {
        "model": openai_body.get("model", "default"),
        "stream": True,  # Always stream internally
    }

    if "max_tokens" in openai_body:
        anthropic_req["max_tokens"] = openai_body["max_tokens"]
    if "temperature" in openai_body:
        anthropic_req["temperature"] = openai_body["temperature"]
    if "top_p" in openai_body:
        anthropic_req["top_p"] = openai_body["top_p"]
    if "stop" in openai_body:
        stop = openai_body["stop"]
        if isinstance(stop, str):
            anthropic_req["stop_sequences"] = [stop]
        elif isinstance(stop, list):
            anthropic_req["stop_sequences"] = stop

    # Translate messages
    # Pydantic handles extracting {"role": "system"} out of messages in MessagesRequest.normalize_system_role_messages
    # so we just pass the messages through directly!
    messages = []
    for msg in openai_body.get("messages", []):
        role = msg.get("role")
        content = msg.get("content")

        # Keep system messages inline for the validator to handle
        if role == "system":
            messages.append({"role": "system", "content": content})
            continue

        # For user/assistant, convert content
        # If it's a string, just pass it
        if isinstance(content, str):
            messages.append({"role": role, "content": content})
        elif isinstance(content, list):
            # Convert vision parts, etc.
            new_content = []
            for part in content:
                if part.get("type") == "text":
                    new_content.append({"type": "text", "text": part.get("text", "")})
                elif part.get("type") == "image_url":
                    url = part["image_url"].get("url", "")
                    # LocalMind or similar might send data URIs
                    if url.startswith("data:image/"):
                        # Extract media_type and base64 data
                        # data:image/png;base64,iVBORw0KGgo...
                        prefix, b64_data = url.split(",", 1)
                        media_type = prefix.split(";", 1)[0].replace("data:", "")
                        new_content.append(
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": b64_data,
                                },
                            }
                        )
            messages.append({"role": role, "content": new_content})

    anthropic_req["messages"] = messages
    return anthropic_req


async def anthropic_stream_to_openai(
    anthropic_stream: Any, model: str
) -> AsyncIterator[str]:
    """Translate Anthropic SSE events to OpenAI SSE events."""
    completion_id = f"chatcmpl-{uuid.uuid4().hex}"
    created = int(time.time())

    buffer = ""
    async for chunk in anthropic_stream:
        buffer += chunk

        while "\n\n" in buffer:
            event_text, buffer = buffer.split("\n\n", 1)

            lines = event_text.split("\n")
            event_type = "message"
            data = None

            for line in lines:
                if line.startswith("event:"):
                    event_type = line[6:].strip()
                elif line.startswith("data:"):
                    raw_data = line[5:].strip()
                    if raw_data:
                        try:
                            data = json.loads(raw_data)
                        except json.JSONDecodeError:
                            data = None

            if not data:
                continue

            if event_type == "message_start":
                # OpenAI uses a leading empty chunk or role chunk
                yield f"data: {json.dumps({'id': completion_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {'role': 'assistant'}, 'finish_reason': None}]})}\n\n"

            elif event_type == "content_block_start":
                # If tool use, wait. If text, ignore until delta
                pass

            elif event_type == "content_block_delta":
                delta = data.get("delta", {})
                if delta.get("type") == "text_delta":
                    text = delta.get("text", "")
                    if text:
                        yield f"data: {json.dumps({'id': completion_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {'content': text}, 'finish_reason': None}]})}\n\n"

            elif event_type == "message_delta":
                # Handle finish_reason if present
                delta = data.get("delta", {})
                stop_reason = delta.get("stop_reason")
                if stop_reason:
                    finish_reason = "stop"
                    if stop_reason == "max_tokens":
                        finish_reason = "length"
                    elif stop_reason == "tool_use":
                        finish_reason = "tool_calls"

                    yield f"data: {json.dumps({'id': completion_id, 'object': 'chat.completion.chunk', 'created': created, 'model': model, 'choices': [{'index': 0, 'delta': {}, 'finish_reason': finish_reason}]})}\n\n"

            elif event_type == "message_stop":
                yield "data: [DONE]\n\n"

            elif event_type == "error":
                # Yield error chunk
                # OpenAI streams don't typically yield error in data: stream, but we can try
                pass
