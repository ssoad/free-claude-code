FROM debian:bookworm-slim

# Install system dependencies (curl and ca-certificates are required for downloading Python via uv)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates gosu && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g @anthropic-ai/claude-code && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user (appuser) to run the application
RUN useradd -M -u 1000 -d /root appuser

# Copy uv from the official astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Enable bytecode compilation for faster startup
ENV UV_COMPILE_BYTECODE=1
# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install dependencies first (leverage Docker layer caching)
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

# Copy the rest of the application
ADD . /app

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

# Pre-cache tiktoken encodings to eliminate runtime network dependencies (fail gracefully if blocked)
ENV TIKTOKEN_CACHE_DIR="/app/.tiktoken_cache"
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')" || true

# Configuration environment variables
ENV HOST="0.0.0.0"
ENV PORT="8082"
# Set FCC_ADMIN_REMOTE_ACCESS to true by default for Docker, otherwise the admin panel won't be accessible
ENV FCC_ADMIN_REMOTE_ACCESS="true"

# The app writes settings and logs to ~/.fcc
# We'll map /root/.fcc to a volume in docker-compose for persistence
VOLUME ["/root/.fcc"]

# Add entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    sed -i 's/\r$//' /docker-entrypoint.sh

# Expose the proxy port
EXPOSE 8082

# Start the server
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["fcc-server"]
