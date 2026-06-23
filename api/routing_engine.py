import random
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from loguru import logger

# --- Cost Registry (per 1M tokens, roughly avg of Input/Output) ---
# This serves as a static heuristic for cost-optimized fallback sorting.
# Free tiers are 0.0.
COST_REGISTRY: dict[str, float] = {
    "open_router/deepseek/deepseek-r1": 2.74,
    "deepseek/deepseek-v4-pro": 0.42,
    "nvidia_nim/qwen/qwen2.5-coder-32b-instruct": 0.0,
    "nvidia_nim/meta/llama-3.3-70b-instruct": 0.0,
    "nvidia_nim/meta/llama-3.1-8b-instruct": 0.0,
    "ollama/deepseek-coder": 0.0,
    "ollama/qwen2.5": 0.0,
    "ollama/llama3.2": 0.0,
    "openai/gpt-5-turbo": 15.0,
    "openai/gpt-4o": 12.5,
    "anthropic/claude-4-sonnet": 18.0,
    "anthropic/claude-4-opus": 45.0,
    "anthropic/claude-4-haiku": 1.5,
    "groq/gpt-oss-120b": 0.0,
}


# --- Latency Tracker ---
# Tracks the rolling average TTFT (Time To First Token) per route.
class LatencyTracker:
    def __init__(self) -> None:
        # route_key -> list of last 5 TTFTs in seconds
        self._history: dict[str, list[float]] = defaultdict(list)

    def record_ttft(self, provider_id: str, provider_model: str, ttft: float) -> None:
        key = f"{provider_id}/{provider_model}"
        self._history[key].append(ttft)
        if len(self._history[key]) > 10:
            self._history[key].pop(0)

    def get_average_ttft(self, provider_id: str, provider_model: str) -> float:
        key = f"{provider_id}/{provider_model}"
        times = self._history[key]
        if not times:
            return 999.0  # Default unknown latency to very high so it falls back naturally
        return sum(times) / len(times)


# Singleton tracker for the running process
latency_tracker = LatencyTracker()


@dataclass
class WeightedRoute:
    original_string: str
    weight: float


def parse_route_string(route_str: str) -> WeightedRoute:
    """
    Parses strings like 'deepseek:0.8' into route='deepseek', weight=0.8.
    Default weight is 1.0 if not specified.
    """
    if ":" in route_str:
        parts = route_str.rsplit(":", 1)
        try:
            return WeightedRoute(original_string=parts[0].strip(), weight=float(parts[1].strip()))
        except ValueError:
            pass
    return WeightedRoute(original_string=route_str.strip(), weight=1.0)


def split_routing_string(full_string: str) -> list[WeightedRoute]:
    """
    Splits by '|' (weighted distribution) or ',' (fallback sequence).
    Currently supports flat fallback sequences with optional weights.
    Returns a list of WeightedRoutes.
    """
    # Prefer '|' if it exists (explicit weighted distribution)
    delimiter = "|" if "|" in full_string else ","
    parts = [p.strip() for p in full_string.split(delimiter) if p.strip()]
    return [parse_route_string(p) for p in parts]


class RoutingEngine:
    @staticmethod
    def get_cost(provider_id: str, provider_model: str) -> float:
        key = f"{provider_id}/{provider_model}"
        # Fallback to provider default if exact model not found
        if key in COST_REGISTRY:
            return COST_REGISTRY[key]
        
        # Heuristics if unknown
        if provider_id in ("ollama", "lmstudio"):
            return 0.0
        if provider_id == "nvidia_nim":
            return 0.1  # Generous free tier proxy
        
        return 10.0  # Assume expensive if unknown

    @staticmethod
    def apply_strategy(routes: list[Any], strategy: str) -> list[Any]:
        """
        Sorts the list of ResolvedRoute objects based on the strategy.
        'routes' is assumed to be a list of `ResolvedRoute` from model_router.py
        """
        if not routes:
            return routes

        # If strategy is "weighted", we randomly select one based on weights.
        if strategy == "weighted":
            # Expecting routes to have `weight` populated (we will inject it in ModelRouter)
            # Weighted choice for the first slot, remaining fallbacks follow.
            logger.debug("Applying weighted routing strategy")
            
            # Grab weights from route.resolved.weight (we'll add this attribute)
            weights = [getattr(r.resolved, "weight", 1.0) for r in routes]
            
            # Ensure no zeroes cause an issue
            if sum(weights) <= 0:
                weights = [1.0] * len(routes)
            
            # Select the primary route based on probability
            primary_index = random.choices(range(len(routes)), weights=weights, k=1)[0]
            
            # Reorder: primary first, then the rest as fallbacks
            reordered = [routes[primary_index]]
            reordered.extend([r for i, r in enumerate(routes) if i != primary_index])
            return reordered

        if strategy == "cost-optimized":
            logger.debug("Applying cost-optimized routing strategy")
            return sorted(
                routes, 
                key=lambda r: RoutingEngine.get_cost(r.resolved.provider_id, r.resolved.provider_model)
            )

        if strategy == "latency-optimized":
            logger.debug("Applying latency-optimized routing strategy")
            return sorted(
                routes,
                key=lambda r: latency_tracker.get_average_ttft(r.resolved.provider_id, r.resolved.provider_model)
            )

        # static (default)
        return routes
