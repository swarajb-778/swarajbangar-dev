"""Agent tools — vector search, GitHub search, graph traversal.

Tools are LangChain ``@tool`` callables invoked by sub-agents via
``.ainvoke({...})``.  They read shared resources (retriever, Neo4j driver)
from the module-level registry rather than through LangGraph state, which
keeps node code and the graph schema clean — see ``registry.py``.
"""
