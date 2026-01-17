"""
AstroWatch Embedding & Vector Search Server
FastAPI server for Ollama embeddings and pgvector search
"""

import os
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from embeddings import EmbeddingService
from vector_store import VectorStore


# Configuration
API_TOKEN = os.getenv("API_TOKEN", "your-secret-token")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/astrowatch")

# Services
embedding_service: Optional[EmbeddingService] = None
vector_store: Optional[VectorStore] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown."""
    global embedding_service, vector_store

    print("Initializing services...")
    embedding_service = EmbeddingService(OLLAMA_HOST)
    vector_store = VectorStore(DATABASE_URL)

    # Initialize vector store
    await vector_store.initialize()

    yield

    # Cleanup
    print("Shutting down services...")
    if vector_store:
        await vector_store.close()


app = FastAPI(
    title="AstroWatch Embedding Server",
    description="Embedding and vector search API for asteroid data",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth dependency
async def verify_token(authorization: str = Header(None)):
    """Verify Bearer token."""
    if not API_TOKEN:
        return True

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[7:]
    if token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")

    return True


# =============================================================================
# Request/Response Models
# =============================================================================

class EmbedRequest(BaseModel):
    texts: list[str]
    model: str = "embedding-gemma"


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int
    tokensUsed: int


class SearchRequest(BaseModel):
    embedding: list[float]
    filters: Optional[dict] = None
    limit: int = 10
    min_score: float = 0.5


class SearchResult(BaseModel):
    id: str
    asteroidId: str
    chunkType: str
    content: str
    score: float
    metadata: dict


class SearchResponse(BaseModel):
    results: list[SearchResult]
    totalCount: int


class IngestRecord(BaseModel):
    id: str
    asteroidId: str
    chunkType: str
    content: str
    embedding: list[float]
    metadata: dict


class IngestRequest(BaseModel):
    records: list[IngestRecord]


class IngestResponse(BaseModel):
    inserted: int
    updated: int
    errors: list[dict]


class DeleteRequest(BaseModel):
    asteroid_id: str


class StatsResponse(BaseModel):
    totalVectors: int
    uniqueAsteroids: int
    chunkTypeCounts: dict


class HealthResponse(BaseModel):
    status: str
    ollama: str
    database: str
    timestamp: str


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health."""
    ollama_status = "healthy"
    db_status = "healthy"

    try:
        if embedding_service:
            await embedding_service.health_check()
    except Exception as e:
        ollama_status = f"unhealthy: {str(e)}"

    try:
        if vector_store:
            await vector_store.health_check()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    overall = "healthy" if ollama_status == "healthy" and db_status == "healthy" else "degraded"

    return HealthResponse(
        status=overall,
        ollama=ollama_status,
        database=db_status,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(verify_token)])
async def embed_texts(request: EmbedRequest):
    """Generate embeddings for texts."""
    if not embedding_service:
        raise HTTPException(status_code=503, detail="Embedding service not initialized")

    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")

    if len(request.texts) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 texts per request")

    try:
        embeddings, tokens = await embedding_service.embed_batch(
            request.texts,
            model=request.model
        )

        return EmbedResponse(
            embeddings=embeddings,
            model=request.model,
            dimensions=len(embeddings[0]) if embeddings else 768,
            tokensUsed=tokens,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search", response_model=SearchResponse, dependencies=[Depends(verify_token)])
async def search_vectors(request: SearchRequest):
    """Search for similar vectors."""
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized")

    try:
        results = await vector_store.search(
            embedding=request.embedding,
            filters=request.filters,
            limit=request.limit,
            min_score=request.min_score,
        )

        return SearchResponse(
            results=[SearchResult(**r) for r in results],
            totalCount=len(results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest", response_model=IngestResponse, dependencies=[Depends(verify_token)])
async def ingest_vectors(request: IngestRequest):
    """Ingest vectors into the store."""
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized")

    try:
        result = await vector_store.ingest([r.model_dump() for r in request.records])

        return IngestResponse(
            inserted=result["inserted"],
            updated=result["updated"],
            errors=result["errors"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/delete", dependencies=[Depends(verify_token)])
async def delete_asteroid(request: DeleteRequest):
    """Delete all vectors for an asteroid."""
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized")

    try:
        deleted = await vector_store.delete_by_asteroid(request.asteroid_id)
        return {"deleted": deleted, "asteroidId": request.asteroid_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats", response_model=StatsResponse, dependencies=[Depends(verify_token)])
async def get_stats():
    """Get vector store statistics."""
    if not vector_store:
        raise HTTPException(status_code=503, detail="Vector store not initialized")

    try:
        stats = await vector_store.get_stats()
        return StatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
