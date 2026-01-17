"""
Vector Store with pgvector
PostgreSQL + pgvector for similarity search
"""

import json
from typing import Optional
import asyncpg


class VectorStore:
    """PostgreSQL + pgvector vector store."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self._pool: Optional[asyncpg.Pool] = None

    async def initialize(self):
        """Initialize the database connection and schema."""
        self._pool = await asyncpg.create_pool(
            self.database_url,
            min_size=2,
            max_size=10,
        )

        async with self._pool.acquire() as conn:
            # Enable pgvector extension
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")

            # Create table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS asteroid_vectors (
                    id VARCHAR(100) PRIMARY KEY,
                    asteroid_id VARCHAR(50) NOT NULL,
                    chunk_type VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector(768) NOT NULL,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(asteroid_id, chunk_type)
                )
            """)

            # Create index for similarity search
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_asteroid_vectors_embedding
                ON asteroid_vectors
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """)

            # Create index for asteroid_id lookups
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_asteroid_vectors_asteroid_id
                ON asteroid_vectors (asteroid_id)
            """)

    async def health_check(self) -> bool:
        """Check database connectivity."""
        if not self._pool:
            raise Exception("Connection pool not initialized")

        async with self._pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            return result == 1

    async def search(
        self,
        embedding: list[float],
        filters: Optional[dict] = None,
        limit: int = 10,
        min_score: float = 0.5,
    ) -> list[dict]:
        """Search for similar vectors."""
        if not self._pool:
            raise Exception("Connection pool not initialized")

        # Build query
        embedding_str = f"[{','.join(map(str, embedding))}]"

        # Base query with cosine similarity
        query = """
            SELECT
                id,
                asteroid_id as "asteroidId",
                chunk_type as "chunkType",
                content,
                1 - (embedding <=> $1::vector) as score,
                metadata
            FROM asteroid_vectors
            WHERE 1 - (embedding <=> $1::vector) >= $2
        """

        params = [embedding_str, min_score]
        param_idx = 3

        # Apply filters
        if filters:
            if "asteroidIds" in filters and filters["asteroidIds"]:
                query += f" AND asteroid_id = ANY(${param_idx}::varchar[])"
                params.append(filters["asteroidIds"])
                param_idx += 1

            if "chunkTypes" in filters and filters["chunkTypes"]:
                query += f" AND chunk_type = ANY(${param_idx}::varchar[])"
                params.append(filters["chunkTypes"])
                param_idx += 1

            if "minRisk" in filters:
                query += f" AND (metadata->>'risk')::float >= ${param_idx}"
                params.append(filters["minRisk"])
                param_idx += 1

            if "maxRisk" in filters:
                query += f" AND (metadata->>'risk')::float <= ${param_idx}"
                params.append(filters["maxRisk"])
                param_idx += 1

            if "isPotentiallyHazardous" in filters:
                query += f" AND (metadata->>'isPotentiallyHazardous')::boolean = ${param_idx}"
                params.append(filters["isPotentiallyHazardous"])
                param_idx += 1

        query += f" ORDER BY score DESC LIMIT ${param_idx}"
        params.append(limit)

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

            return [
                {
                    "id": row["id"],
                    "asteroidId": row["asteroidId"],
                    "chunkType": row["chunkType"],
                    "content": row["content"],
                    "score": float(row["score"]),
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                }
                for row in rows
            ]

    async def ingest(self, records: list[dict]) -> dict:
        """Insert or update vectors."""
        if not self._pool:
            raise Exception("Connection pool not initialized")

        inserted = 0
        updated = 0
        errors = []

        async with self._pool.acquire() as conn:
            for record in records:
                try:
                    embedding_str = f"[{','.join(map(str, record['embedding']))}]"

                    result = await conn.execute(
                        """
                        INSERT INTO asteroid_vectors
                            (id, asteroid_id, chunk_type, content, embedding, metadata)
                        VALUES ($1, $2, $3, $4, $5::vector, $6)
                        ON CONFLICT (asteroid_id, chunk_type)
                        DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            metadata = EXCLUDED.metadata,
                            created_at = NOW()
                        """,
                        record["id"],
                        record["asteroidId"],
                        record["chunkType"],
                        record["content"],
                        embedding_str,
                        json.dumps(record.get("metadata", {})),
                    )

                    if "INSERT" in result:
                        inserted += 1
                    else:
                        updated += 1

                except Exception as e:
                    errors.append({"record_id": record.get("id"), "error": str(e)})

        return {"inserted": inserted, "updated": updated, "errors": errors}

    async def delete_by_asteroid(self, asteroid_id: str) -> int:
        """Delete all vectors for an asteroid."""
        if not self._pool:
            raise Exception("Connection pool not initialized")

        async with self._pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM asteroid_vectors WHERE asteroid_id = $1",
                asteroid_id,
            )
            # Parse "DELETE X" response
            return int(result.split()[-1])

    async def get_stats(self) -> dict:
        """Get vector store statistics."""
        if not self._pool:
            raise Exception("Connection pool not initialized")

        async with self._pool.acquire() as conn:
            total = await conn.fetchval("SELECT COUNT(*) FROM asteroid_vectors")
            unique_asteroids = await conn.fetchval(
                "SELECT COUNT(DISTINCT asteroid_id) FROM asteroid_vectors"
            )
            chunk_counts = await conn.fetch(
                """
                SELECT chunk_type, COUNT(*) as count
                FROM asteroid_vectors
                GROUP BY chunk_type
                """
            )

            return {
                "totalVectors": total,
                "uniqueAsteroids": unique_asteroids,
                "chunkTypeCounts": {row["chunk_type"]: row["count"] for row in chunk_counts},
            }

    async def close(self):
        """Close the connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def __aenter__(self):
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
