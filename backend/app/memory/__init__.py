"""Memory layer — Neo4j knowledge graph + Redis session history.

``KnowledgeGraph`` (graph.py) stores entities and their relationships so the
agent can reason about how technologies, companies, and concepts connect, and
recall what a session has discussed.  ``SessionManager`` (session.py) keeps a
short, TTL'd rolling history of each conversation in Redis.
"""
