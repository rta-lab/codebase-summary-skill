# Analysis Phases

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


## Phase 3: Structure and validate

Produce `<output-dir>/summary.json` conforming to the schema in `summary-schema.json` (in this skill's directory — read it before writing output).

### Steps

1. **Read `summary-schema.json`** from this skill's directory. Follow it exactly — `additionalProperties: false` is enforced.

2. **Populate every required field.** Key rules:
   - `tech_stack` entries must have `evidence_file` — a real file path you verified exists
   - `modules` must include `dependencies` (internal module references) — empty array if none
   - `api_endpoints` must have `file` and `line` — if you can't cite the exact location, go back and verify before including it
   - `architecture_pattern` must be one of the allowed enum values. If the code doesn't fit any cleanly, use `"other"` and explain in `architecture_description`

3. **Run the validator:**
   ```
   node <skill-dir>/validate-summary.cjs <output-dir>/summary.json
   ```
   Fix any failures before finishing. The validator checks structural conformance only — it doesn't verify that your claims are accurate (that's your responsibility from Phase 1).

4. **Cross-check against SUMMARY.md.** The JSON and the markdown must agree. If the markdown lists 12 endpoints and the JSON has 8, one of them is wrong. Reconcile before delivering.
