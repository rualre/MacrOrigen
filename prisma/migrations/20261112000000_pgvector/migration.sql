-- Ejecutar después de crear las tablas con Prisma y antes de poblar embeddings.
CREATE EXTENSION IF NOT EXISTS vector;

-- Prisma representa este campo como Unsupported("vector(768)").
ALTER TABLE "AlimentoColombiano" ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- Para catálogos pequeños se recomienda búsqueda exacta; añadir HNSW al crecer:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "AlimentoColombiano_embedding_hnsw"
-- ON "AlimentoColombiano" USING hnsw ("embedding" vector_cosine_ops);
