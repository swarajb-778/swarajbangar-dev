// Everything personal lives in this file. Edit it and reload: the explorer,
// editor, terminal, search, and assistant all read from here.
//
// Sources: résumé (Oct 2026), swarajbangar-dev.vercel.app, and GitHub READMEs.
// Anything marked FABRICATED is illustrative filler; verify or replace it
// before you publish. Find them all with: grep -n FABRICATED src/content.js

export default {
  profile: {
    name: "Swaraj Bangar",
    handle: "swaraj.bangar",
    role: "AI Engineer · Full-Stack Software Engineer",
    roles: ["AI Engineer", "Agentic Engineer", "Full-Stack Software Engineer", "AI-native builder"],
    tagline: "I build agentic AI systems on top of production-grade full-stack platforms.",
    bio:
      "Full-stack software engineer with 4+ years shipping fintech platforms at McKinsey and Amazon (via ThoughtWorks): " +
      "Python/FastAPI and Go microservices, React and Next.js frontends, Kafka, and AWS. Now I build agentic AI on top: " +
      "LangGraph workflows, hybrid RAG with cited answers, voice agents, and MCP tooling, measured like any other production system.",
    location: "San Francisco, CA",
    email: "swarajbangar778@gmail.com",
    availability: "Open to AI Engineer, Agentic Engineer, and Full-Stack roles · open to relocate",
    openToWork: true,
    avatarUrl: "https://avatars.githubusercontent.com/u/67543214?v=4",
  },

  highlights: [
    "4+ years in production fintech",
    "Agentic AI · LangGraph · RAG",
    "Python · TypeScript · Go",
    "AWS · Kubernetes · Kafka",
    "MS CS · Agentic AI research",
  ],

  focus: [
    { title: "AI engineering", text: "Hybrid RAG (BM25 + embeddings), evidence-linked citations, abstention controls, and evals that gate releases." },
    { title: "Agentic systems", text: "LangGraph multi-step agents, tool calling, MCP servers, and real-time voice agents over WebRTC." },
    { title: "Full-stack platforms", text: "React, Next.js, and TypeScript on top of FastAPI, Node.js, Go, GraphQL, and gRPC services." },
    { title: "Distributed systems", text: "Kafka event pipelines, idempotent workers, CQRS, Kubernetes on AWS EKS, and SLO-based alerting." },
    // FABRICATED: describe how you actually work with coding agents.
    { title: "AI-native workflow", text: "I pair with coding agents for spec → plan → test-first implementation, and review every line they write." },
  ],

  socials: [
    { label: "GitHub", handle: "swarajb-778", url: "https://github.com/swarajb-778" },
    { label: "LinkedIn", handle: "swarajb778", url: "https://www.linkedin.com/in/swarajb778/" },
    { label: "Portfolio v1", handle: "swarajbangar-dev", url: "https://swarajbangar-dev.vercel.app" },
  ],

  projects: [
    {
      name: "SuperVoiceAI",
      slug: "supervoiceai",
      year: 2026,
      description:
        "Multi-tenant agentic voice AI SaaS: the OpenAI Realtime API over WebRTC books appointments through LLM tool calling, with Supabase row-level security per tenant and a dependency-free embeddable widget.",
      tags: ["agentic-ai", "voice", "next.js", "supabase"],
      repo: "https://github.com/swarajb-778/SuperVoiceAI",
      live: "https://super-voice-ai.vercel.app",
      featured: true,
      pinned: 1,
    },
    {
      name: "SkyMart",
      slug: "skymart",
      year: 2026,
      description: "E-commerce platform for all.",
      tags: ["javascript", "e-commerce"],
      repo: "https://github.com/swarajb-778/SkyMart",
      live: "https://sky-mart-rho-eight.vercel.app",
      featured: false,
      pinned: 2,
    },
    {
      name: "TDS Agents",
      slug: "tds-agents",
      year: 2026,
      description:
        "Sellers complete a California Transfer Disclosure Statement by voice or by form, switching mid-question, and get a filled, signable PDF pushed to DocuSeal.",
      tags: ["voice-agent", "typescript", "documents"],
      repo: "https://github.com/swarajb-778/TDS_Agents",
      live: "https://tds-agents.vercel.app",
      featured: true,
    },
    {
      name: "RapidOrch MCP",
      slug: "rapidorch-mcp",
      year: 2025,
      description:
        "A universal API layer for AI agents: ingests OpenAPI and GraphQL specs at runtime and generates normalized, type-safe adapters with an LLM, behind a FastAPI gateway.",
      tags: ["mcp", "agentic-ai", "fastapi", "python"],
      repo: "https://github.com/swarajb-778/RAPIDORCH-MCP",
      live: "",
      featured: true,
    },
    {
      name: "Collaborito",
      slug: "collaborito",
      year: 2025,
      description:
        "AI-powered collaboration and workspace-booking app for entrepreneurs: projects, real-time chat, tasks, and smart collaborator matching with AI summaries.",
      tags: ["react-native", "claude", "supabase", "websockets"],
      repo: "https://github.com/swarajb-778/Collaborito",
      live: "",
      featured: false,
      pinned: 6,
    },
    {
      name: "SEOptiMCP",
      slug: "seoptimcp",
      year: 2025,
      description: "SEO automation platform built on Model Context Protocol servers, with Gemini-powered content analysis and an 8-step audit workflow.",
      tags: ["mcp", "gemini", "react", "express"],
      repo: "https://github.com/swarajb-778/SEOptiMCP",
      live: "",
      featured: false,
    },
    {
      name: "EcoScan",
      slug: "ecoscan",
      year: 2025,
      description: "Real-time waste classification PWA: YOLOv8 object detection from camera, upload, or voice input, sorted into recycle, compost, or landfill.",
      tags: ["computer-vision", "yolov8", "pwa"],
      repo: "https://github.com/swarajb-778/EcoScan",
      live: "",
      featured: false,
    },
    {
      name: "Quant Execution Lab",
      slug: "blockhouse-quant",
      year: 2025,
      description:
        "Market-microstructure research on MBP-10 order-book data: slippage models, temporary price-impact fits, and optimal execution with dynamic programming and convex optimization.",
      tags: ["python", "quant", "optimization"],
      repo: "https://github.com/swarajb-778/Blockhouse_Quant_Trade",
      live: "",
      featured: false,
    },
    {
      name: "Candidate Sync",
      slug: "candidate-sync",
      year: 2026,
      description: "Candidate-facing hiring portal: application timelines, interview prep, recruiter threads, documents, and offer signing across 16 routes.",
      tags: ["react", "redux", "mongodb", "zod"],
      repo: "https://github.com/swarajb-778/candidateSync",
      live: "",
      featured: false,
    },
    {
      name: "StockPilot",
      slug: "stockpilot",
      year: 2025,
      description: "Cloud-native inventory management dashboard with Next.js and Node.js, deployed on AWS.",
      tags: ["next.js", "node", "aws"],
      repo: "https://github.com/swarajb-778/StockPilot",
      live: "",
      featured: false,
      pinned: 5,
    },
    {
      name: "JWT Interact",
      slug: "jwt-interact",
      year: 2026,
      description: "An interactive, visual way to learn how JSON Web Tokens are built, signed, and verified.",
      tags: ["security", "jwt", "education"],
      repo: "https://github.com/swarajb-778/JWT-Interact",
      live: "https://swarajb-778.github.io/JWT-Interact/",
      featured: false,
      pinned: 3,
    },
    {
      name: "Portfolio v1",
      slug: "portfolio-v1",
      year: 2026,
      description: "Systems that prove themselves: a breakable microservices Chaos Lab, the SwarajOS agent with its reasoning trace, and a RAG X-ray.",
      tags: ["next.js", "langgraph", "fastapi"],
      repo: "https://github.com/swarajb-778/swarajbangar-dev",
      live: "https://swarajbangar-dev.vercel.app",
      featured: false,
      pinned: 4,
    },
    {
      name: "Editor Portfolio",
      slug: "editor-portfolio",
      year: 2026,
      description: "This site: an editor-style portfolio with a terminal, command palette, full-text search, an agent lab, and themes. Zero dependencies.",
      tags: ["javascript", "css", "no-build"],
      repo: "", // add the GitHub URL once you push it
      live: "",
      featured: false,
    },
  ],

  // Your current site splits ThoughtWorks into Senior (Dec 2023 – Sep 2024) and
  // Full Stack (May 2021 – Dec 2023); the résumé lists one role. Pick one.
  experience: [
    {
      role: "Full Stack Software Engineer",
      company: "McKinsey & Company",
      location: "",
      start: "2026-01",
      end: null,
      summary: "Treasury and credit-risk intelligence platform, plus an agentic research assistant that gives analysts cited answers instead of raw tables.",
      highlights: [
        "Scaled risk microservices 42% (≈780 → 1,110 req/min) within the same compute, p95, and error budget, across 15K+ daily transactions",
        "Built an agentic research platform (LangGraph, hybrid BM25 + embedding RAG on Pinecone, cited answers, abstention) that cut analyst research time 40%",
        "Cut one recurring exposure review from about 20 to 3 person-hours",
        "Brought dashboard readiness from 4.0s to 1.7s and p75 LCP from 3.18s to 2.34s",
        "Replaced 5–7 REST round trips per view with 1–2 GraphQL queries through a typed BFF layer",
        "Defined gRPC/Protobuf contracts with deadline propagation, bounded retries, and X-Ray tracing",
      ],
      stack: ["python", "fastapi", "langgraph", "pinecone", "react", "graphql", "kafka", "aws-eks"],
    },
    {
      role: "Full Stack Software Engineer",
      company: "Amazon (via ThoughtWorks)",
      location: "",
      start: "2021-05",
      end: "2024-09",
      summary: "PCI DSS-scoped lending, payment reconciliation, and settlement microservices handling 500K+ transactions a month at ≈99.8% correctness.",
      highlights: [
        "Raised first-pass auto-reconciliation from 84% to 97% with a rules and confidence-scored matching engine",
        "Cut duplicate ledger effects 30% with idempotent Go workers, Kafka offset management, and DLQ-backed retries",
        "Shipped Kafka audit streams and CQRS projections (150K–250K events/day); Redis cut PostgreSQL reads 60%",
        "Shortened release cycles from about 2 weeks to 3 days with rebuilt CI/CD and contract tests",
        "Lowered team MTTR 25% with SLO-based alerting; authored RFCs and mentored junior engineers",
      ],
      stack: ["python", "go", "typescript", "next.js", "kafka", "postgresql", "redis", "aws"],
    },
  ],

  education: [
    {
      degree: "MS, Computer Science",
      school: "California State University, East Bay",
      start: "2024-09",
      end: "2026-05",
      notes: "Research: agentic AI systems. Coursework: advanced ML, distributed systems, NLP",
    },
    {
      degree: "BS, Computer Science",
      school: "Pune University",
      start: "2018-08",
      end: "2021-04",
      notes: "Coursework: data structures and algorithms, OOP, system design",
    },
  ],

  // Logos live in assets/logos/. Most are Devicon (MIT) or Simple Icons (CC0).
  // openai.svg and pinecone.svg are those projects' own marks, from their official repos.
  // Items without a logo show initials.
  skills: [
    {
      group: "AI & Agents",
      items: [
        { name: "LangGraph", note: "Stateful, multi-step agent graphs", logo: "assets/logos/langgraph.svg" },
        { name: "LangChain", note: "Chains, tools, and retrievers", logo: "assets/logos/langchain.svg" },
        { name: "OpenAI API", note: "GPT models and the Realtime API over WebRTC", logo: "assets/logos/openai.svg" },
        { name: "Claude", note: "Reasoning and tool use", logo: "assets/logos/claude.svg" },
        { name: "Gemini", note: "Content analysis in SEOptiMCP", logo: "assets/logos/gemini.svg" },
        { name: "Amazon Bedrock", note: "Managed foundation models on AWS" },
        { name: "Model Context Protocol", note: "MCP servers that expose tools to agents", logo: "assets/logos/mcp.svg" },
        { name: "Pinecone", note: "Vector search for hybrid RAG", logo: "assets/logos/pinecone.svg" },
        { name: "pgvector", note: "Embeddings inside PostgreSQL" },
        { name: "FAISS", note: "Local similarity search" },
        { name: "RAG systems", note: "BM25 + embeddings, rerank, cited answers" },
        { name: "PyTorch", note: "Training and fine-tuning", logo: "assets/logos/pytorch.svg" },
        { name: "TensorFlow", note: "Model training", logo: "assets/logos/tensorflow.svg" },
      ],
    },
    {
      group: "Languages",
      items: [
        { name: "Python", note: "FastAPI, AsyncIO, Pytest", logo: "assets/logos/python.svg" },
        { name: "TypeScript", note: "React, Node.js, typed API clients", logo: "assets/logos/typescript.svg" },
        { name: "JavaScript", note: "Browser and Node.js", logo: "assets/logos/javascript.svg" },
        { name: "Go", note: "Concurrent payment and settlement workers", logo: "assets/logos/go.svg" },
        { name: "Java", note: "Spring Boot services", logo: "assets/logos/java.svg" },
        { name: "C++", note: "Algorithms and systems coursework", logo: "assets/logos/cplusplus.svg" },
        { name: "SQL", note: "PostgreSQL and MySQL" },
      ],
    },
    {
      group: "Frontend",
      items: [
        { name: "React", note: "Role-based dashboards and data grids", logo: "assets/logos/react.svg" },
        { name: "Next.js", note: "SSR operations modules", logo: "assets/logos/nextjs.svg" },
        { name: "React Native", note: "Cross-platform mobile apps", logo: "assets/logos/react.svg" },
        { name: "Expo", note: "Mobile builds for Collaborito", logo: "assets/logos/expo.svg" },
        { name: "Redux Toolkit", note: "Client state", logo: "assets/logos/redux.svg" },
        { name: "TanStack Query", note: "Caching and server state", logo: "assets/logos/tanstack.svg" },
        { name: "Jest", note: "Unit and component tests", logo: "assets/logos/jest.svg" },
        { name: "Playwright", note: "End-to-end tests", logo: "assets/logos/playwright.svg" },
        { name: "Cypress", note: "End-to-end tests", logo: "assets/logos/cypress.svg" },
      ],
    },
    {
      group: "Backend & APIs",
      items: [
        { name: "FastAPI", note: "Python microservices and RAG APIs", logo: "assets/logos/fastapi.svg" },
        { name: "Node.js", note: "Services and BFF layers", logo: "assets/logos/nodejs.svg" },
        { name: "Express", note: "REST APIs and middleware", logo: "assets/logos/express.svg" },
        { name: "Spring Boot", note: "Java services", logo: "assets/logos/spring.svg" },
        { name: "GraphQL", note: "Aggregating BFF with typed clients", logo: "assets/logos/graphql.svg" },
        { name: "gRPC", note: "Protobuf contracts and deadlines", logo: "assets/logos/grpc.svg" },
        { name: "Pydantic", note: "Typed request and response models", logo: "assets/logos/pydantic.svg" },
        { name: "JWT & OAuth 2.0", note: "Token-based auth at API boundaries", logo: "assets/logos/jwt.svg" },
      ],
    },
    {
      group: "Data & Streaming",
      items: [
        { name: "Apache Kafka", note: "Event pipelines, CQRS, replay", logo: "assets/logos/kafka.svg" },
        { name: "PostgreSQL", note: "Constraints, indexing, Aurora", logo: "assets/logos/postgresql.svg" },
        { name: "Redis", note: "Caching and pub/sub", logo: "assets/logos/redis.svg" },
        { name: "MongoDB", note: "Document store", logo: "assets/logos/mongodb.svg" },
        { name: "DynamoDB", note: "Key-value at scale", logo: "assets/logos/dynamodb.svg" },
        { name: "Elasticsearch", note: "Search", logo: "assets/logos/elasticsearch.svg" },
        { name: "Neo4j", note: "Graph data", logo: "assets/logos/neo4j.svg" },
        { name: "Supabase", note: "Postgres, auth, row-level security", logo: "assets/logos/supabase.svg" },
      ],
    },
    {
      group: "Cloud & DevOps",
      items: [
        { name: "AWS", note: "EKS, Lambda, S3, RDS, CloudWatch, X-Ray", logo: "assets/logos/aws.svg" },
        { name: "Kubernetes", note: "Rollouts and rollbacks on EKS", logo: "assets/logos/kubernetes.svg" },
        { name: "Docker", note: "Containerized services", logo: "assets/logos/docker.svg" },
        { name: "Terraform", note: "Infrastructure as code", logo: "assets/logos/terraform.svg" },
        { name: "GitHub Actions", note: "CI/CD pipelines", logo: "assets/logos/githubactions.svg" },
        { name: "Jenkins", note: "CI/CD pipelines", logo: "assets/logos/jenkins.svg" },
        { name: "CircleCI", note: "CI pipelines", logo: "assets/logos/circleci.svg" },
      ],
    },
  ],
};
