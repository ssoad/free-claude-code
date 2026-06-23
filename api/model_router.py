"""Model routing for Claude-compatible requests."""

from __future__ import annotations

from dataclasses import dataclass

from loguru import logger

from config.provider_ids import SUPPORTED_PROVIDER_IDS
from config.settings import Settings

from .gateway_model_ids import decode_gateway_model_id
from .models.anthropic import MessagesRequest, TokenCountRequest
from .routing_engine import RoutingEngine, parse_route_string


@dataclass(frozen=True, slots=True)
class ResolvedModel:
    original_model: str
    provider_id: str
    provider_model: str
    provider_model_ref: str
    thinking_enabled: bool
    weight: float = 1.0


@dataclass(frozen=True, slots=True)
class RoutedMessagesRequest:
    request: MessagesRequest
    resolved: ResolvedModel


@dataclass(frozen=True, slots=True)
class RoutedTokenCountRequest:
    request: TokenCountRequest
    resolved: ResolvedModel


class ModelRouter:
    """Resolve incoming Claude model names to configured provider/model pairs."""

    def __init__(self, settings: Settings):
        self._settings = settings

    def resolve_all(self, claude_model_name: str) -> list[ResolvedModel]:
        (
            direct_provider_id,
            direct_provider_model,
            force_thinking_enabled,
        ) = self._direct_provider_model(claude_model_name)
        if direct_provider_id is not None and direct_provider_model is not None:
            thinking_enabled = (
                force_thinking_enabled
                if force_thinking_enabled is not None
                else self._settings.resolve_thinking(direct_provider_model)
            )
            logger.debug(
                "MODEL DIRECT: '{}' -> provider='{}' model='{}' thinking={}",
                claude_model_name,
                direct_provider_id,
                direct_provider_model,
                thinking_enabled,
            )
            return [ResolvedModel(
                original_model=claude_model_name,
                provider_id=direct_provider_id,
                provider_model=direct_provider_model,
                provider_model_ref=claude_model_name,
                thinking_enabled=thinking_enabled,
            )]

        provider_model_refs = self._settings.resolve_models(claude_model_name)
        thinking_enabled = self._settings.resolve_thinking(claude_model_name)

        resolved_list = []
        for provider_model_ref_raw in provider_model_refs:
            weighted_route = parse_route_string(provider_model_ref_raw)
            provider_model_ref = weighted_route.original_string
            
            provider_id = Settings.parse_provider_type(provider_model_ref)
            provider_model = Settings.parse_model_name(provider_model_ref)
            if provider_model != claude_model_name:
                logger.debug(
                    "MODEL MAPPING: '{}' -> '{}' (weight={})", claude_model_name, provider_model, weighted_route.weight
                )
            resolved_list.append(ResolvedModel(
                original_model=claude_model_name,
                provider_id=provider_id,
                provider_model=provider_model,
                provider_model_ref=provider_model_ref,
                thinking_enabled=thinking_enabled,
                weight=weighted_route.weight
            ))
        return resolved_list

    def _direct_provider_model(
        self, model_name: str
    ) -> tuple[str | None, str | None, bool | None]:
        decoded = decode_gateway_model_id(model_name)
        if decoded is not None:
            if decoded.provider_id not in SUPPORTED_PROVIDER_IDS:
                return None, None, None
            return (
                decoded.provider_id,
                decoded.provider_model,
                decoded.force_thinking_enabled,
            )

        provider_id, separator, provider_model = model_name.partition("/")
        if not separator:
            return None, None, None
        if provider_id not in SUPPORTED_PROVIDER_IDS:
            return None, None, None
        if not provider_model:
            return None, None, None
        return provider_id, provider_model, None

    def resolve_messages_request_all(
        self, request: MessagesRequest
    ) -> list[RoutedMessagesRequest]:
        """Return an internal routed request context list for failover."""
        resolved_list = self.resolve_all(request.model)
        routed_list = []
        for resolved in resolved_list:
            routed = request.model_copy(deep=True)
            routed.model = resolved.provider_model
            routed_list.append(RoutedMessagesRequest(request=routed, resolved=resolved))
            
        # Apply the selected routing strategy before returning
        return RoutingEngine.apply_strategy(routed_list, self._settings.routing_strategy)

    def resolve_token_count_request(
        self, request: TokenCountRequest
    ) -> RoutedTokenCountRequest:
        """Return an internal token-count request context."""
        # For token counting, we just use the first model config
        resolved = self.resolve_all(request.model)[0]
        routed = request.model_copy(
            update={"model": resolved.provider_model}, deep=True
        )
        return RoutedTokenCountRequest(request=routed, resolved=resolved)
