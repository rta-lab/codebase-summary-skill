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

## Workflow overview

Follow all three phases in order. Read the referenced files from this skill's directory before executing each phase.

1. **Scan** — Run Phase 1 from [ANALYSIS.md](ANALYSIS.md) to explore the codebase with parallel research agents. Produces raw intelligence about the project.
2. **Synthesize** — Run Phase 2 from [ANALYSIS.md](ANALYSIS.md) to combine agent outputs into `SUMMARY.md` with a Mermaid architecture diagram.
3. **Structure & Validate** — Run Phase 3 from [ANALYSIS.md](ANALYSIS.md) to produce `summary.json` conforming to `summary-schema.json`, validated by `validate-summary.cjs`.

## Anti-Patterns to Avoid

1. **Listing files without explaining purpose.** A directory tree is not a summary. Every module mentioned needs a one-sentence explanation of what it does and why it exists.
2. **Copying the README as the summary.** The README is an input, not the output. Your job is to verify claims against the actual code.
3. **Inventing architecture patterns.** If the code doesn't have a clear MVC separation, don't impose one. Describe what's there, not what should be there.
4. **Missing the actual entry points.** Every codebase has a "start here" — `main()`, `app.listen()`, `if __name__`, the CLI entrypoint. Find it. If you can't find it, that's a finding worth reporting.
5. **Ignoring configuration and environment.** What env vars does it need? What config files does it read? What external services does it connect to? These are part of the architecture.
6. **Over-documenting trivial code.** A `utils/formatDate.js` doesn't need its own section. Group utilities and mention them in aggregate.
7. **Generating a Mermaid diagram that doesn't match the prose.** The diagram and the written summary must describe the same architecture. If they disagree, one of them is wrong.
