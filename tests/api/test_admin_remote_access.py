"""Tests for FCC_ADMIN_REMOTE_ACCESS feature."""

from __future__ import annotations

from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.admin_urls import admin_launch_message, local_admin_url
from api.app import create_app
from config.settings import Settings
from providers.registry import ProviderRegistry


def _local_client(app):
    return TestClient(app, client=("127.0.0.1", 50000))


def _remote_client(app):
    return TestClient(app, client=("203.0.113.10", 50000))


def _clear_env(monkeypatch):
    for key in (
        "MODEL",
        "NVIDIA_NIM_API_KEY",
        "OPENROUTER_API_KEY",
        "ANTHROPIC_AUTH_TOKEN",
        "FCC_ENV_FILE",
        "FCC_ADMIN_REMOTE_ACCESS",
        "HOST",
        "PORT",
        "LOG_FILE",
    ):
        monkeypatch.delenv(key, raising=False)


def _set_home(monkeypatch, tmp_path):
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("USERPROFILE", str(tmp_path))
    monkeypatch.chdir(tmp_path)


# ---------------------------------------------------------------------------
# Settings validator tests
# ---------------------------------------------------------------------------


class TestAdminRemoteAccessValidator:
    def test_remote_access_disabled_by_default(self, monkeypatch, tmp_path):
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        from config.settings import get_settings

        get_settings.cache_clear()
        settings = get_settings()
        assert settings.admin_remote_access is False
        get_settings.cache_clear()

    def test_remote_access_rejects_without_auth_token(self, monkeypatch, tmp_path):
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        monkeypatch.setenv("FCC_ADMIN_REMOTE_ACCESS", "true")
        monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "")
        from config.settings import get_settings

        get_settings.cache_clear()
        with pytest.raises(Exception, match="ANTHROPIC_AUTH_TOKEN must be set"):
            get_settings()
        get_settings.cache_clear()

    def test_remote_access_accepts_with_auth_token(self, monkeypatch, tmp_path):
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        monkeypatch.setenv("FCC_ADMIN_REMOTE_ACCESS", "true")
        monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "my-secret-key")
        from config.settings import get_settings

        get_settings.cache_clear()
        settings = get_settings()
        assert settings.admin_remote_access is True
        assert settings.anthropic_auth_token == "my-secret-key"
        get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Admin route access control tests
# ---------------------------------------------------------------------------


class TestAdminRemoteAccess:
    def test_admin_local_only_blocks_remote(self, monkeypatch, tmp_path):
        """Default: remote requests to /admin get 403."""
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        app = create_app(lifespan_enabled=False)
        assert _remote_client(app).get("/admin").status_code == 403

    def test_admin_local_only_allows_local(self, monkeypatch, tmp_path):
        """Default: local requests to /admin get 200."""
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        app = create_app(lifespan_enabled=False)
        assert _local_client(app).get("/admin").status_code == 200

    def test_admin_remote_access_allows_with_auth(self, monkeypatch, tmp_path):
        """Remote access enabled + valid auth token = 200."""
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        monkeypatch.setenv("FCC_ADMIN_REMOTE_ACCESS", "true")
        monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "test-remote-key")
        from config.settings import get_settings

        get_settings.cache_clear()
        app = create_app(lifespan_enabled=False)
        client = TestClient(app, client=("203.0.113.10", 50000))
        response = client.get(
            "/admin",
            headers={"x-api-key": "test-remote-key"},
        )
        assert response.status_code == 200
        get_settings.cache_clear()

    def test_admin_remote_access_rejects_without_auth(self, monkeypatch, tmp_path):
        """Remote access enabled + missing auth header = 401."""
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        monkeypatch.setenv("FCC_ADMIN_REMOTE_ACCESS", "true")
        monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "test-remote-key")
        from config.settings import get_settings

        get_settings.cache_clear()
        app = create_app(lifespan_enabled=False)
        client = TestClient(app, client=("203.0.113.10", 50000))
        response = client.get("/admin")
        assert response.status_code == 401
        get_settings.cache_clear()

    def test_admin_remote_access_rejects_bad_auth(self, monkeypatch, tmp_path):
        """Remote access enabled + wrong auth token = 401."""
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        monkeypatch.setenv("FCC_ADMIN_REMOTE_ACCESS", "true")
        monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "test-remote-key")
        from config.settings import get_settings

        get_settings.cache_clear()
        app = create_app(lifespan_enabled=False)
        client = TestClient(app, client=("203.0.113.10", 50000))
        response = client.get(
            "/admin",
            headers={"x-api-key": "wrong-key"},
        )
        assert response.status_code == 401
        get_settings.cache_clear()

    def test_admin_api_config_remote_access_with_auth(self, monkeypatch, tmp_path):
        """Remote access enabled + valid auth = admin API works."""
        _set_home(monkeypatch, tmp_path)
        _clear_env(monkeypatch)
        monkeypatch.setenv("FCC_ADMIN_REMOTE_ACCESS", "true")
        monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "test-remote-key")
        from config.settings import get_settings

        get_settings.cache_clear()
        app = create_app(lifespan_enabled=False)
        client = TestClient(app, client=("203.0.113.10", 50000))
        response = client.get(
            "/admin/api/config",
            headers={"x-api-key": "test-remote-key"},
        )
        assert response.status_code == 200
        get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Admin URL display tests
# ---------------------------------------------------------------------------


class TestAdminUrlDisplay:
    def test_local_only_uses_loopback(self):
        settings = Settings.model_construct(
            host="0.0.0.0", port=8082, admin_remote_access=False
        )
        assert local_admin_url(settings) == "http://127.0.0.1:8082/admin"

    def test_remote_uses_actual_host(self):
        settings = Settings.model_construct(
            host="0.0.0.0", port=8082, admin_remote_access=True
        )
        assert local_admin_url(settings) == "http://0.0.0.0:8082/admin"

    def test_remote_with_specific_host(self):
        settings = Settings.model_construct(
            host="192.168.1.100", port=9090, admin_remote_access=True
        )
        assert local_admin_url(settings) == "http://192.168.1.100:9090/admin"

    def test_launch_message_local_only(self):
        settings = Settings.model_construct(
            host="0.0.0.0", port=8082, admin_remote_access=False
        )
        msg = admin_launch_message(settings)
        assert "(local-only)" in msg
        assert "remote" not in msg

    def test_launch_message_remote_enabled(self):
        settings = Settings.model_construct(
            host="0.0.0.0", port=8082, admin_remote_access=True
        )
        msg = admin_launch_message(settings)
        assert "(remote access enabled, auth required)" in msg
        assert "(local-only)" not in msg


# ---------------------------------------------------------------------------
# Runtime startup log test for remote access
# ---------------------------------------------------------------------------


class TestRuntimeRemoteAccessLog:
    @pytest.mark.asyncio
    async def test_startup_log_shows_remote_access_enabled(self, tmp_path):
        import api.runtime as api_runtime_mod

        _RUNTIME_EXTRAS = {
            "voice_note_enabled": True,
            "whisper_model": "base",
            "whisper_device": "cpu",
            "hf_token": "",
            "nvidia_nim_api_key": "",
            "claude_cli_bin": "claude",
            "uses_process_anthropic_auth_token": lambda: False,
            "messaging_rate_limit": 1,
            "messaging_rate_window": 1.0,
            "max_message_log_entries_per_chat": None,
            "debug_platform_edits": False,
            "debug_subagent_stack": False,
            "log_api_error_tracebacks": False,
            "log_raw_messaging_content": False,
            "log_raw_cli_diagnostics": False,
            "log_messaging_error_details": False,
            "configured_chat_model_refs": lambda: (),
        }

        settings = SimpleNamespace(
            **_RUNTIME_EXTRAS,
            messaging_platform="none",
            telegram_bot_token=None,
            allowed_telegram_user_id=None,
            discord_bot_token=None,
            allowed_discord_channels=None,
            allowed_dir=str(tmp_path / "workspace"),
            claude_workspace=str(tmp_path / "data"),
            host="0.0.0.0",
            port=8082,
            admin_remote_access=True,
        )
        runtime = api_runtime_mod.AppRuntime(
            app=FastAPI(), settings=cast(Settings, settings)
        )
        uvicorn_logger = MagicMock()

        with (
            patch.object(
                api_runtime_mod.logging, "getLogger", return_value=uvicorn_logger
            ),
            patch.object(api_runtime_mod.logger, "info"),
            patch.object(
                ProviderRegistry, "validate_configured_models", new=AsyncMock()
            ),
            patch.object(ProviderRegistry, "start_model_list_refresh"),
            patch.object(ProviderRegistry, "cleanup", new=AsyncMock()),
            patch(
                "messaging.platforms.factory.create_messaging_platform",
                return_value=None,
            ),
        ):
            await runtime.startup()
            await runtime.shutdown()

        uvicorn_logger.info.assert_called_once_with(
            "%s",
            "Admin UI: http://0.0.0.0:8082/admin (remote access enabled, auth required)",
        )
