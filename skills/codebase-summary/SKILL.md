---
name: codebase-summary
description: Generate a structured summary of any codebase — architecture overview, tech stack, module map, and full API inventory with a Mermaid diagram. Use when asked to summarize a codebase, explain a project structure, map an API surface, generate architecture documentation, onboard onto a new repo, or produce a technical overview. Triggers on phrases like "summarize this codebase", "what does this project do", "map the architecture", "list all endpoints", "give me an overview", "document this repo", or any request to understand an unfamiliar codebase. Also use when someone uploads or points at a project directory and asks "what is this?" or "how is this structured?"
---

# Codebase Summary

You are a technical analyst. Your job is to produce a clear, accurate, structured summary of a codebase — the kind of document that lets a new engineer understand the project in 10 minutes.

## Platform terminology

This skill is agent-neutral. In the methodology:

- **Task tool** means the coding agent's delegation or sub-agent mechanism.
- **`research` agent** means a delegated agent optimized for focused codebase exploration.
- **`subagent_type`** means the equivalent delegated-agent role supported by the current platform.

Use the platform's equivalent capabilities while preserving the specified roles, parallelism, and prompts.

## Setup

Before starting, establish two paths:

- **Target**: the codebase to analyze (from the user's request or the current working directory)
- **Output directory**: where all artifacts go. Ask the user if not specified, or default to `~/codebase-summary/<repo-name>/run-<N>` where `<N>` is the next unused integer. Create it if it doesn't exist.

All files written during the analysis go in the output directory:

- `SUMMARY.md` — human-readable summary with architecture diagram (Phase 2)
- `summary.json` — machine-readable structured output (Phase 3)

Subagents do NOT write files — they return results to you via the Task tool. You write all files.

## Core Principles

### Accuracy over completeness

Report what you can verify by reading the code. If a module's purpose is unclear, say so — don't guess. An honest "purpose unclear from code inspection" is better than a plausible-sounding fabrication.

### Follow the code, not the README

READMEs go stale. If the README says "supports PostgreSQL and MySQL" but the code only imports `pg`, report what the code shows and note the discrepancy. The README is a hypothesis; the source code is the truth.

### Calibrate depth to the codebase

A 200-line CLI tool needs a paragraph, not a 10-page report. A monorepo with 15 services needs more. Match the output to the input. Padding a summary to look thorough is the same failure mode as padding a security report.

### APIs mean all external interfaces

"API" isn't just REST endpoints. It includes CLI commands, exported library functions, gRPC services, WebSocket handlers, message queue consumers, scheduled jobs — anything an external caller or system interacts with. Inventory them all.

## Anti-Patterns to Avoid

1. **Listing files without explaining purpose.** A directory tree is not a summary. Every module mentioned needs a one-sentence explanation of what it does and why it exists.
2. **Copying the README as the summary.** The README is an input, not the output. Your job is to verify claims against the actual code.
3. **Inventing architecture patterns.** If the code doesn't have a clear MVC separation, don't impose one. Describe what's there, not what should be there.
4. **Missing the actual entry points.** Every codebase has a "start here" — `main()`, `app.listen()`, `if __name__`, the CLI entrypoint. Find it. If you can't find it, that's a finding worth reporting.
5. **Ignoring configuration and environment.** What env vars does it need? What config files does it read? What external services does it connect to? These are part of the architecture.
6. **Over-documenting trivial code.** A `utils/formatDate.js` doesn't need its own section. Group utilities and mention them in aggregate.
7. **Generating a Mermaid diagram that doesn't match the prose.** The diagram and the written summary must describe the same architecture. If they disagree, one of them is wrong.

---

## Phase 1: Scan the codebase

Launch **multiple `research` agents in parallel** to explore different facets of the codebase. Each agent focuses on a specific aspect so the combined output covers the full picture without any single agent running out of context.

**Agent 1a: Project identity and tech stack**
```
Explore the codebase at <path>. Answer with specifics — file paths, line numbers, version strings:

1. What is this project? What problem does it solve? Who is the intended user?
2. What is the tech stack?
   - Languages (check file extensions, build configs, lockfiles)
   - Frameworks (check imports, package.json, requirements.txt, go.mod, Cargo.toml, etc.)
   - Databases (check connection strings, ORM configs, migration files)
   - External services (check API client imports, SDK usage, webhook handlers)
3. What is the entry point? (main function, app bootstrap, CLI entrypoint, index file)
4. How is it built? (build scripts, Makefile, Dockerfile, CI config)
5. How is it deployed? (Dockerfile, serverless config, platform manifests, deploy scripts)
6. What does the dependency tree look like? (count of direct deps, any notable or unusual ones)

Read the actual lockfiles and config files — don't rely on the README alone.
If the README makes claims about the stack, verify each one against the source.
Return specific file paths for everything you reference.
```

**Agent 1b: Architecture and module structure**
```
Explore the codebase at <path>. Map the internal architecture:

1. What is the directory structure? (top 2–3 levels, with purpose of each directory)
2. What are the major modules/packages/components? For each one:
   - Name and location
   - Single-sentence purpose
   - Key dependencies (what it imports from other internal modules)
3. How does data flow through the system?
   - Where does input enter? (HTTP handler, CLI parser, message consumer, file watcher)
   - Where is it processed? (business logic layer, service layer, domain models)
   - Where does output go? (database, response, file, queue, external API)
4. What patterns does the code use?
   - Architectural pattern (monolith, microservices, modular monolith, layered, event-driven)
   - Design patterns visible in the code (repository pattern, middleware chain, plugin system, pub/sub)
   - DON'T impose patterns that aren't there. If the code is a flat script, say so.
5. What are the cross-cutting concerns?
   - Logging (what library, where configured)
   - Error handling (centralized handler? per-route? unhandled?)
   - Configuration (env vars, config files, defaults)
   - Authentication/authorization if present

Return a module dependency list: which internal modules depend on which.
```

**Agent 1c: API and external interface inventory**
```
Explore the codebase at <path>. Produce a COMPLETE inventory of external interfaces:

1. HTTP/REST endpoints:
   - Method, path, handler function, file:line
   - Any route parameters, query parameters, or request body shape
   - Authentication requirement (if visible from middleware or decorators)
   - Group by router/module/resource

2. CLI commands (if applicable):
   - Command name, description, arguments, flags
   - Handler function and file:line

3. GraphQL operations (if applicable):
   - Queries, mutations, subscriptions with their types

4. gRPC services (if applicable):
   - Service name, RPC methods, request/response types

5. WebSocket handlers (if applicable):
   - Event names, payload shapes

6. Exported library API (if this is a library/package):
   - Exported functions, classes, types
   - Public vs internal API boundary

7. Background jobs / scheduled tasks / message consumers:
   - What triggers them, what they do, where defined

8. Webhooks / callbacks (incoming):
   - Endpoint, expected payload, what triggers it externally

Be EXHAUSTIVE for categories that apply. Skip categories that don't exist in this codebase.
Return exact file paths and line numbers for every interface found.
```

### Synthesizing Phase 1 outputs

Collect all three agents' outputs. Before proceeding, verify consistency:

- If Agent 1a says "uses PostgreSQL" but Agent 1b found no database module, investigate.
- If Agent 1c found endpoints that Agent 1b didn't mention in the module map, update the module map.
- If any agent reports "unclear" or "not found", note it as a gap — don't fill it with assumptions.

Compile the raw findings into a working document you'll use in Phase 2. This intermediate document is NOT written to disk — it's your working memory for synthesis.


## Phase 2: Synthesize into SUMMARY.md

Using the combined Phase 1 outputs, write `<output-dir>/SUMMARY.md` with this structure:

```markdown
# Codebase Summary: <project-name>

## Overview

<2–4 sentences: what this project is, who it's for, and what problem it solves.
If there's a discrepancy between the README and the actual code, note it.>

## Tech Stack

| Layer | Technology | Evidence |
|-------|-----------|----------|
| Language | e.g. TypeScript 5.x | tsconfig.json, package.json |
| Framework | e.g. Express 4.18 | package.json, src/app.ts |
| Database | e.g. PostgreSQL via Prisma | prisma/schema.prisma |
| ... | ... | ... |

<Only include layers that exist. "Evidence" = the file that proves it.>

## Architecture

<Prose description of the architecture: 1–3 paragraphs depending on complexity.
Describe the actual pattern (not the aspirational one).
Cover: entry point → request/data flow → business logic → persistence → response.
Mention any notable architectural decisions or tradeoffs.>

### Architecture Diagram

```mermaid
<Mermaid diagram here — see diagram rules below>
```

## Module Map

<For each major module/package/directory:>

### <module-name> (`path/to/module/`)

<1–2 sentences: what it does and why it exists.>
- **Key files**: list 2–3 most important files with one-line descriptions
- **Internal dependencies**: which other modules it imports
- **External dependencies**: notable third-party packages it uses

## API Reference

<Organized by category. Only include categories that exist.>

### HTTP Endpoints

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | /api/users | getUsers (src/routes/users.ts:24) | Required | List all users |
| ... | ... | ... | ... | ... |

### CLI Commands

| Command | Description | Handler |
|---------|-------------|---------|
| ... | ... | ... |

<Add sections for GraphQL, gRPC, WebSocket, library exports, background jobs
as applicable. Omit sections that don't apply.>

## Configuration & Environment

<What env vars does this project need? What config files does it read?
What external services does it depend on at runtime?>

## Build & Deploy

<How to build, test, and deploy. Based on actual scripts/configs found,
not README instructions that may be outdated.>

## Observations

<Brief notes on:
- Code quality patterns (consistent style? tests? type safety?)
- Gaps or concerns noticed during analysis (dead code, missing error handling, etc.)
- Areas that would benefit from deeper investigation>
```

### Mermaid diagram rules

The architecture diagram must follow these constraints:

1. **Match the prose.** Every box in the diagram must correspond to something described in the text. No mystery boxes.
2. **Use the right diagram type.**
   - `graph TD` (top-down) for request/data flow
   - `graph LR` (left-right) for pipeline/processing chains
   - `C4Context` or `C4Container` for system-level views of larger projects
   - Choose based on what the architecture actually looks like
3. **Label edges.** Every arrow should say what flows along it (HTTP, SQL, events, function calls).
4. **Group related components.** Use `subgraph` for logical groupings (e.g., "API Layer", "Data Layer").
5. **Keep it readable.** 5–15 nodes is the sweet spot. If you need more, you're at the wrong abstraction level — zoom out.
6. **No aspirational components.** Only diagram what exists in the code right now.
7. **Quote all labels.** Wrap every node label and subgraph title in double quotes: `A["my label"]`, `subgraph "My Group"`. This prevents special characters from breaking the parser.
8. **No curly braces in labels.** Mermaid interprets `{` as diamond shape syntax. Use parentheses or backticks instead: `chat_(room_name)` not `chat_{room_name}`.
9. **Use `<br/>` for line breaks.** Never use `\n` in labels — Mermaid doesn't interpret it. Use `<br/>` inside a quoted label: `["Line one<br/>Line two"]`.
10. **Escape special characters in edge labels.** Wrap edge labels containing `/`, `.`, `_`, or spaces in quotes: `-->|"HTTP GET /api"| B` not `-->|HTTP GET /api| B`.


## Phase 3: Structure and validate

Produce `<output-dir>/summary.json` as a structured JSON object.

### Schema

The JSON must conform to this structure exactly. Extra fields are not allowed.

**Top-level fields (all required):**

- `project_name` (string) — name of the project
- `description` (string) — 2–4 sentence description
- `entry_point` (string) — relative path to main entry point
- `architecture_pattern` (string, enum) — one of: `monolith`, `modular_monolith`, `microservices`, `serverless`, `cli_tool`, `library`, `pipeline`, `event_driven`, `plugin_based`, `static_site`, `other`
- `architecture_description` (string) — prose description of the architecture
- `architecture_diagram_mermaid` (string) — complete Mermaid diagram source
- `tech_stack` (array, min 1 item) — each item:
  - `layer` (enum): `language`, `framework`, `database`, `orm`, `cache`, `queue`, `search`, `auth`, `cloud_platform`, `containerization`, `ci_cd`, `testing`, `monitoring`, `other`
  - `technology` (string): name and version
  - `evidence_file` (string): file path proving usage
- `modules` (array) — each item:
  - `name` (string)
  - `path` (string): relative path
  - `purpose` (string): one sentence
  - `key_files` (array of strings): 2–5 important files
  - `dependencies` (array of strings): internal module names, empty if none
- `api_endpoints` (array) — each item:
  - `category` (enum): `http`, `graphql`, `grpc`, `websocket`, `cli`, `library_export`, `background_job`, `webhook`, `message_consumer`, `other`
  - `method` (string): HTTP method, command name, etc. (`N/A` if not applicable)
  - `path` (string): URL path, command string, function signature
  - `handler` (string): handler function name
  - `file` (string): relative file path
  - `line` (integer): line number
  - `auth_required` (enum): `yes`, `no`, `unknown`
  - `description` (string): one-line description
- `configuration` (object):
  - `env_vars` (array) — each: `name`, `required` (yes/no/unknown), `description`
  - `config_files` (array of strings)
  - `external_services` (array of strings)
- `observations` (array) — each:
  - `category` (enum): `quality`, `gap`, `notable`, `concern`
  - `description` (string)

### Validation

If `summary-schema.json` and `validate-summary.cjs` are available in this skill's directory, run:

```
node <skill-dir>/validate-summary.cjs <output-dir>/summary.json
```

If the validator files are not available, self-validate by checking:
1. All required fields are present
2. All enum values are from the allowed lists above
3. `tech_stack` has at least one entry with `layer: "language"`
4. `architecture_diagram_mermaid` starts with a valid Mermaid keyword (`graph`, `flowchart`, `sequenceDiagram`, etc.)
5. HTTP endpoints use standard HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
6. No duplicate module names
7. The JSON and `SUMMARY.md` agree — same endpoint count, same modules, same tech stack

Fix any issues before delivering.
