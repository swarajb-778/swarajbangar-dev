"""RAG endpoints — placeholder for Phase 3.

Real implementation arrives in subsequent prompts (embedder, retriever,
reranker, hybrid search). For now these endpoints return 501 so /docs
documents the contract without misleading callers.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models import RAGEmbedRequest, RAGQueryRequest, RAGQueryResponse

router = APIRouter()


@router.post(
    "/query",
    response_model=RAGQueryResponse,
    responses={501: {"description": "Not implemented yet"}},
)
async def rag_query(req: RAGQueryRequest) -> RAGQueryResponse:
    """Run a query through the hybrid-search RAG pipeline.

    Not implemented yet — wired in a later prompt.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="RAG pipeline not implemented in this scaffold.",
    )


@router.post(
    "/embed",
    responses={501: {"description": "Not implemented yet"}},
)
async def rag_embed(req: RAGEmbedRequest) -> dict[str, list[float]]:
    """Return the 384-dim embedding for an input string.

    Not implemented yet — wired in a later prompt.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Embedder endpoint not implemented in this scaffold.",
    )
