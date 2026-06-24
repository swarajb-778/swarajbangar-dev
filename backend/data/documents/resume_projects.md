# Notable Projects

## Flagship — GenAI-Powered Treasury & Credit-Risk Intelligence Platform (McKinsey & Company)

Current role. Swaraj architected the backend, built the React dashboards, and built the GenAI intelligence layer on top.

**The problem:** Treasury and credit-risk teams were drowning in data but starved of insight — 15,000+ transactions a day, liquidity to monitor, credit exposure to assess, most of it done by hand. In a domain where a late or wrong read on risk has real financial consequences, that lag was a genuine business problem. The goal was to turn a pile of transactions into fast, trustworthy, decision-ready intelligence.

**The approach (in layers):**

1. **Cloud-native backend foundation** — microservices in Python/FastAPI (treasury management, liquidity monitoring, credit-exposure analytics), backed by PostgreSQL + Redis, exposed via GraphQL and REST. Independent services → ~42% better backend scalability.
2. **Real-time event processing** — Kafka-driven event processing and server-side analytics so transactions are handled as events, not nightly batches → 35% faster visibility, ~45% less manual effort; new consumers (alerting, analytics) added without touching producers.
3. **React analytics dashboards** — React/TypeScript dashboards that surface liquidity, exposure, and risk across 15,000+ daily transactions; TypeScript keeps the financial data correctly typed end to end.
4. **GenAI financial-intelligence layer** — retrieval-augmented generation: data embedded into Pinecone, orchestrated with LangChain, LLMs answering analyst questions behind secure APIs, grounded in retrieved facts. Cut analyst research effort ~40%.
5. **ML forecasting & risk reporting** — predictive models tracked with MLflow → forecasting/risk accuracy from 82% to 96%.
6. **Security & production hardening** — Docker, Kubernetes, Terraform, OAuth 2.0, CI/CD, CloudWatch on AWS → production incidents down ~25%.

**Hardest problem:** making the GenAI safe. The naive approach is to just call an LLM, but in a financial product you cannot have it inventing numbers about liquidity or credit exposure. Grounding every answer in retrieval (RAG), constraining prompts, validating outputs, and keeping a human in the loop is what made it shippable. The lesson: in finance, the value of AI isn't fluency — it's how reliably grounded it is.

**Why RAG over fine-tuning:** the data changes constantly (new transactions/reports daily), so RAG just updates the vector store instead of retraining; it grounds each answer in specific, citable sources (critical when an analyst needs to verify); and it avoids baking sensitive data into model weights.

**STAR:** *Situation* — analysts manually making sense of 15K+ daily transactions, slow and risky. *Task* — build a platform turning that into fast, trustworthy intelligence (backend, dashboards, GenAI). *Action* — Python/FastAPI microservices, Kafka real-time monitoring, React dashboards, a RAG/LangChain/Pinecone GenAI layer, ML forecasting with MLflow, hardened on AWS. *Result* — scalability +42%, risk visibility +35% with 45% less manual effort, analyst effort −40%, forecasting 82%→96%, incidents −25%.

## ThoughtWorks — Fintech Reconciliation Platform (84% → 97%)

Lending and payment-reconciliation platforms processing 500K+ transactions/month at 99.8% accuracy. The headline win: reconciliation matching was relying on logic that missed edge cases, so a meaningful share of transactions needed manual intervention. Swaraj built automated matching engines with more robust rules, event-driven validation so records were checked as they flowed through, data-validation frameworks to catch bad records early, and optimized the PostgreSQL queries the matching ran on — taking matched-correctly from 84% to 97% and removing most manual cleanup downstream. Also cut onboarding time 34%, loan-processing time 38% (Redis caching + async), and accelerated exception detection/settlement 45% with Pandas/Kafka ETL. Tech: Python, REST APIs, PostgreSQL, MongoDB, Redis, Kafka, microservices, Azure, Docker, Jenkins, CI/CD, OAuth 2.0/JWT.
