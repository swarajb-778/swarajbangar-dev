# Frequently Asked Questions (first-person)

Grounded answers in Swaraj's own voice, drawn from his real experience. Use these to answer how/why questions about his engineering.

## How do you prevent an LLM from hallucinating in a financial product?

The core technique is grounding — I use retrieval-augmented generation, so the model answers from real data I retrieve rather than from its own memory. The pipeline: embed the documents and data into Pinecone, on a query retrieve the most relevant chunks, and pass those to the LLM as context so the answer is anchored in facts. On top of that I constrain the prompts, validate outputs, and where possible cite the source so an analyst can check. In finance you keep a human in the loop — the system informs the decision, it doesn't make it. You treat fluency as worthless and grounding as everything.

## Walk me through your RAG pipeline.

Offline, I take the source documents and data, chunk them sensibly, generate embeddings, and store the vectors in Pinecone. At query time I embed the question, do a similarity search to pull the most relevant chunks, and assemble those into a prompt as context; LangChain orchestrates the chain, and the LLM answers grounded in that context behind a secure API. The two things that most affect quality are how I chunk the documents and how good the retrieval is — if retrieval pulls the wrong context, the answer is wrong no matter how good the model is. So a lot of the real work is retrieval quality, not the model.

## Why FastAPI over Django or Flask?

Three reasons: async support out of the box (matters for I/O-bound DB and LLM calls), built-in Pydantic validation (typed, validated request/response — exactly what you want when the data is financial), and automatic OpenAPI docs. Django when I want the full batteries-included framework with admin and ORM; Flask for something tiny; but for high-throughput API services, FastAPI fits best.

## You took reconciliation accuracy from 84% to 97% — how?

The matching logic missed a lot of edge cases, so a meaningful share of transactions needed manual intervention. I built automated matching engines with more robust rules, backed by event-driven validation so records were checked as they flowed through, added data-validation frameworks to catch bad records early, and optimized the PostgreSQL queries the matching ran on. Step by step that took matched-correctly from 84% to 97% and meant far less manual cleanup downstream.

## Why event-driven with Kafka for payment monitoring?

Payments need to be acted on as they happen, not in a nightly batch. Kafka gives me real-time processing and decouples producers from consumers — the service emitting payment events doesn't need to know who's listening. I could add new consumers (risk alerting, analytics) without touching the producers, and Kafka handles high throughput so monitoring stays reliable under load. That design gave 35% faster visibility and ~45% less manual effort.

## How do you secure an API handling financial data?

In layers: authentication/authorization at the edge with OAuth 2.0 and JWT; least-privilege access with IAM; secrets and keys in Vault or AWS KMS, never in code; encryption in transit and at rest; and monitoring plus audit logging. In financial software I treat security as a first-class design concern from the start, not something added at the end.

## How do you decide between SQL and NoSQL?

My default for core financial data is PostgreSQL — relational, transactional, strong consistency for anything involving money. I reach for NoSQL when the shape or scale calls for it: MongoDB or DynamoDB for flexible/document-shaped or high-throughput data, and Redis for caching and low-latency lookups — that caching is what cut loan-processing time 38% at ThoughtWorks. Match the store to the data's shape and access pattern, not by habit.

## How do you test a system where correctness is critical?

Layered: unit tests for the core logic (especially calculation/matching), integration tests for service interactions, end-to-end tests (Playwright/Selenium) for critical flows, API tests with Postman, and SonarQube gating quality — all in CI/CD so nothing ships without passing. In financial software, testing is what lets you claim something like 99.8% accuracy and mean it.

## Why RAG instead of fine-tuning on the financial data?

The data changes constantly — new transactions and reports every day — and with RAG I just update the vector store instead of retraining to stay current. RAG also lets me ground each answer in specific, citable sources (analysts need to verify), and it's safer because I'm not baking sensitive data into model weights. Fine-tuning makes sense for changing a model's style/behavior broadly; for "answer questions accurately from current financial data," retrieval is the better tool.

## Your resume lists a lot of tech — how deep are you really?

I'd tier it. Daily and deep: Python, FastAPI, React, TypeScript, PostgreSQL, Docker, and my GenAI stack (RAG, LangChain, Pinecone). Frequent and solid: Kafka, Redis, Kubernetes, Terraform, AWS, the ML stack. Supporting / breadth: C++, Node, some alternative frameworks. I'd rather tell you exactly where I'm strong than pretend the whole list is equal.

## Are you open to work / where are you based?

Yes — I'm open to software engineering roles. I'm based in San Francisco and open to relocate. Reach me at swarajbangar778@gmail.com.
