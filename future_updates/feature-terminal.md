# Phase 2.5: Terminal Masterpiece

This plan implements the high-ROI, backend-focused terminal improvements requested to make the portfolio immediately stand out to Staff/Senior engineering hiring managers.

## Proposed Changes

### 1. New Powerful Async Commands
We will add the following commands to `src/components/terminal/async-commands.ts` so they execute over time with animations:

*   **`htop`**: A real-time updating ASCII dashboard. It clears the terminal (`\x1b[2J\x1b[H`) and repaints every 1 second until the user aborts (`Ctrl+C`). Shows fake (but realistic) metrics for `FastAPI`, `pgvector`, `Redis`, and `Next.js`.
*   **`trace`**: Simulates a distributed trace request (e.g., `trace last-request`), streaming the lifecycle of an API call through the gateway, rate limiter, vector search, and LLM generation, complete with microsecond latencies.
*   **`chaos`**: A CLI tool that triggers a global UI event. `chaos inject --target=rate-limiter` will print status in the terminal and dispatch a custom `chaos-injected` window event. (This lays the groundwork for bridging terminal actions to the visual React UI).
*   **`git log`**: Fetches the latest 5 commits from the `swarajb-778/swarajbangar-dev` GitHub repository via public API, displaying the hashes, messages, and dates. If the API rate limits, it falls back to a realistic mocked history.

### 2. Powerful Static Commands & Updates
We will add/modify these in `src/components/terminal/CommandParser.ts`:

*   **`architecture`**: Outputs an ASCII representation of the portfolio's tech stack (Edge -> VPS -> DB).
*   **`stack --detailed`**: Replaces or supplements `skills`. Categorizes skills by architectural layers: `[DATA LAYER]`, `[COMPUTE]`, `[INFRA]`.
*   **`experience`**: We will rewrite the output to include specific, quantified system metrics (e.g., instead of just "SDE", we add bullet points like "Designed gRPC microservices handling 15k req/sec").

### Component Modifications

#### [MODIFY] `src/components/terminal/async-commands.ts`
- Add `runHtop(term, signal)`
- Add `runTrace(term, signal)`
- Add `runChaos(term, signal)`
- Add `runGitLog(term, signal)`
- Register them in `getAsyncCommand(input)`

#### [MODIFY] `src/components/terminal/CommandParser.ts`
- Add `trace`, `htop`, `chaos`, `architecture`, `stack`, `git` to `COMMAND_NAMES`.
- Add parsing cases for `architecture`, `stack`.
- Rewrite the `experience` command to output heavy backend metrics.
- Add `help` text descriptions for these new commands.

## User Review Required

> [!IMPORTANT]
> Because I am updating the **`experience`** command to show specific backend metrics, I have guessed at realistic numbers based on your profile (e.g., "Scaled APIs to 10k RPS", "Reduced latency by 40%"). If you have specific, real metrics you want to use for your time at Amazon or Softgenio, please let me know, otherwise, I will use strong industry-standard placeholder metrics that you can easily edit later.

## Verification Plan

- Run `npm run lint` and `npm run build` to ensure no strictly-typed errors.
- Verify `htop` loops and can be cancelled with `Ctrl+C`.
- Verify `trace` streams its output asynchronously.
- Verify `git log` successfully fetches or mocks data.
- Verify `chaos` outputs correctly.
