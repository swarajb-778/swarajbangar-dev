"""Agent orchestration endpoints — placeholder for Phase 3.

POST /v1/agent/orchestrate streams Server-Sent Events:
  - AgentStepEvent (one per LangGraph node transition)
  - AgentTokenEvent (one per LLM streamed token)
  - AgentDoneEvent  (final, with accounting)

The real implementation is wired in a later prompt.
"""


from fastapi import APIRouter, HTTPException, status

from app.models import AgentChatRequest

router = APIRouter()


@router.post(
    "/orchestrate",
    responses={501: {"description": "Not implemented yet"}},
)
async def orchestrate(req: AgentChatRequest) -> dict[str, str]:
    """Run a message through the LangGraph multi-agent orchestrator.

    Streams Server-Sent Events. Not implemented yet — wired in a later prompt.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Agent orchestrator not implemented in this scaffold.",
    )
