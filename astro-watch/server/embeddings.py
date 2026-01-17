"""
Ollama Embedding Service
Wrapper for EmbeddingGemma via Ollama
"""

import asyncio
from typing import Optional
import httpx


class EmbeddingService:
    """Service for generating embeddings via Ollama."""

    def __init__(
        self,
        ollama_host: str = "http://localhost:11434",
        default_model: str = "embedding-gemma",
        timeout: float = 30.0,
    ):
        self.ollama_host = ollama_host.rstrip("/")
        self.default_model = default_model
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def health_check(self) -> bool:
        """Check if Ollama is available."""
        try:
            response = await self.client.get(f"{self.ollama_host}/api/tags")
            response.raise_for_status()
            return True
        except Exception as e:
            raise Exception(f"Ollama health check failed: {e}")

    async def embed(self, text: str, model: Optional[str] = None) -> tuple[list[float], int]:
        """Generate embedding for a single text."""
        model = model or self.default_model

        try:
            response = await self.client.post(
                f"{self.ollama_host}/api/embeddings",
                json={"model": model, "prompt": text},
            )
            response.raise_for_status()
            data = response.json()

            embedding = data.get("embedding", [])
            # Estimate tokens (rough approximation)
            tokens = len(text.split())

            return embedding, tokens
        except httpx.HTTPError as e:
            raise Exception(f"Embedding request failed: {e}")

    async def embed_batch(
        self,
        texts: list[str],
        model: Optional[str] = None,
        batch_size: int = 10,
    ) -> tuple[list[list[float]], int]:
        """Generate embeddings for multiple texts."""
        model = model or self.default_model
        embeddings = []
        total_tokens = 0

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            batch_results = await asyncio.gather(
                *[self.embed(text, model) for text in batch],
                return_exceptions=True,
            )

            for result in batch_results:
                if isinstance(result, Exception):
                    # Use zero vector for failed embeddings
                    embeddings.append([0.0] * 768)
                else:
                    embedding, tokens = result
                    embeddings.append(embedding)
                    total_tokens += tokens

        return embeddings, total_tokens

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
