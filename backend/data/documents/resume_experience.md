# Work Experience

Swaraj Shrikant Bangar — Full Stack Developer (Python / FastAPI / React / AWS / GenAI). About 3 years 9 months of professional software engineering, all in financial software: ThoughtWorks in India (May 2021 – Sep 2024), then a US Master's, now McKinsey & Company (Jan 2026 – Present). The through-theme is trust — every system built is one a business has to rely on with money on the line.

## McKinsey & Company — Full Stack Developer (Jan 2026 – Present)

Treasury & credit-risk management. Owns backend services and React dashboards for treasury management, liquidity monitoring, and credit-exposure analytics, plus the GenAI financial-intelligence layer on top. Insight is surfaced across 15,000+ transactions a day.

- Architected cloud-native microservices in Python and FastAPI (with some C# and C++) for treasury management, liquidity monitoring, and credit-exposure analytics — backed by PostgreSQL and Redis, exposed through GraphQL and REST. Splitting into independent services (instead of a monolith) is what improved backend scalability by ~42%.
- Built the GenAI financial-intelligence layer himself: retrieval-augmented generation with LangChain and Pinecone, with LLMs answering analyst questions behind secure APIs — grounded in retrieved facts, not guesses. Cut analyst research effort by ~40% because analysts get answers instead of digging through dashboards.
- Built real-time payment monitoring and risk assessment on Kafka-driven event processing and server-side analytics pipelines — transactions processed as events as they happen, not in batches. Gave the business 35% faster visibility and ~45% less manual effort.
- Built the React/TypeScript dashboards that turn the processed data into something a treasury or risk analyst can read — TypeScript keeping the financial data correctly typed end to end.
- Brought machine learning into treasury forecasting and risk reporting (predictive models tracked with MLflow), improving forecasting/risk accuracy from 82% to 96%.
- Hardened the platform for production with Docker, Kubernetes, Terraform, OAuth 2.0, CI/CD, and CloudWatch on AWS — dropping production incidents by ~25%.

The hardest problem was making the GenAI safe: in a financial product you cannot have an LLM inventing numbers about liquidity or credit exposure. The whole layer is grounded in retrieval, with constrained prompts, output validation, and a human in the loop. In this domain, grounding beats fluency.

## ThoughtWorks — Senior Full Stack Software Engineer (Dec 2023 – Sep 2024)

Promoted to Senior on the fintech lending and payment platforms. Focused on performance, deployment automation, security, and production reliability.

- Minimized loan-application processing time by 38% through workflow automation, Redis caching, backend performance tuning, risk-assessment services, and API-driven microservices.
- Modernized deployment automation and platform security using Docker, Jenkins, CI/CD pipelines, OAuth 2.0, JWT authentication, and monitoring/DevOps best practices — improving platform stability by 30%.
- Owned production reliability: remediated critical incidents on the lending and payment platforms, lifting availability by 32% and cutting incident resolution time by 27%.

## ThoughtWorks — Full Stack Software Engineer (May 2021 – Dec 2023)

Where Swaraj grew up as an engineer — the bulk of his depth. Built fintech lending and payment-reconciliation platforms handling 500K+ transactions a month at 99.8% accuracy, using Python, REST APIs, PostgreSQL, MongoDB, Redis, microservices, and Azure Cloud.

- Took transaction-reconciliation accuracy from 84% to 97% by building automated matching engines, event-driven validation/systems, data-validation frameworks, and PostgreSQL query optimization — a concrete before-and-after he owned.
- Established secure customer onboarding and transaction-validation workflows (API integrations, OAuth 2.0, JWT, asynchronous processing, scalable backend services), reducing onboarding time by 34%.
- Accelerated exception detection and settlement tracking by 45% using Python, Pandas, Kafka, ETL pipelines, distributed data processing, and financial-analytics frameworks.

The lesson from ThoughtWorks: in money systems you design for correctness and security from day one.

## The gap (Sep 2024 – Jan 2026)

The window between ThoughtWorks and McKinsey is the Master of Science in Computer Science at California State University — moving from India to the US to study full-time, which also set up the move into McKinsey. No internships are counted (none on the resume).
