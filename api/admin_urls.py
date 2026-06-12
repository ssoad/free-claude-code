"""Helpers for presenting local admin URLs."""

from __future__ import annotations

from config.settings import Settings


def _browser_host_for_local_urls(settings: Settings) -> str:
    """Host fragment for URLs shown to humans on the same machine as the server."""

    host = settings.host.strip() if settings.host else "127.0.0.1"
    if host in {"0.0.0.0", "::", "[::]"}:
        host = "127.0.0.1"
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    return host


def _admin_host(settings: Settings) -> str:
    """Host fragment for admin URLs, using actual bind address when remote access is on."""

    if settings.admin_remote_access:
        host = settings.host.strip() if settings.host else "0.0.0.0"
        if ":" in host and not host.startswith("["):
            host = f"[{host}]"
        return host
    return _browser_host_for_local_urls(settings)


def local_proxy_root_url(settings: Settings) -> str:
    """Return the proxy root URL (no path) for clients on the same machine."""

    return f"http://{_browser_host_for_local_urls(settings)}:{settings.port}"


def local_admin_url(settings: Settings) -> str:
    """Return a browser-friendly URL for the admin UI."""

    return f"http://{_admin_host(settings)}:{settings.port}/admin"


def admin_launch_message(settings: Settings) -> str:
    """Return the startup message shown by supported launch commands."""

    if settings.admin_remote_access:
        return f"Admin UI: {local_admin_url(settings)} (remote access enabled, auth required)"
    return f"Admin UI: {local_admin_url(settings)} (local-only)"
