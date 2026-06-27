# codebase-summary

A coding-agent skill that turns your agent into a technical analyst. It orchestrates parallel research agents through a three-phase pipeline — scan, synthesize, and validate — to produce a structured summary of any codebase with an architecture diagram and full API inventory.

Inspired by [Cloudflare's security-audit-skill](https://github.com/cloudflare/security-audit-skill), this skill uses the same multi-agent, schema-validated pattern but focuses on understanding rather than attacking.

## What it does

The skill runs a structured analysis in three phases:

1. **Scan** — parallel research agents explore the codebase from three angles: project identity & tech stack, internal architecture & module structure, and API/external interface inventory.
2. **Synthesize** — combines all agent outputs into `SUMMARY.md` with a Mermaid architecture diagram, module map, and API reference table.
3. **Structure & Validate** — writes `summary.json` conforming to `summary-schema.json`, validated by `validate-summary.cjs`.

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Setup, core principles, workflow overview, and anti-patterns |
| `ANALYSIS.md` | Phase 1–3 agent prompts, synthesis instructions, and diagram rules |
| `summary-schema.json` | JSON schema for `summary.json` output |
| `validate-summary.cjs` | Zero-dependency Node.js validator for schema conformance |

## Output artifacts

| File | Format | Description |
|------|--------|-------------|
| `SUMMARY.md` | Markdown | Human-readable summary with architecture diagram, module map, API reference |
| `summary.json` | JSON | Machine-readable structured output conforming to `summary-schema.json` |

## Usage

Start your coding agent in (or pointed at) the codebase you want to understand, then ask:

```
summarize this codebase
```

```
give me an overview of ./src
```

```
what does this project do? map the architecture and list all APIs
```

```
generate a codebase summary, output to ~/docs/my-project
```

The skill activates automatically when the request matches its trigger (summarize, overview, architecture, map the codebase, list endpoints, etc.).

## Installation

Install the skill with the [Skills CLI](https://skills.sh/):

```
npx skills add https://github.com/rta-lab/codebase-summary-skill \
  --skill codebase-summary
```

Use `--global` for a user-level installation:

```
npx skills add https://github.com/rta-lab/codebase-summary-skill \
  --skill codebase-summary \
  --global
```

Run `npx skills --help` for agent-selection and non-interactive options.

## Requirements

- A coding agent with a model that supports tool use and parallel sub-agents
- Node.js (for `validate-summary.cjs` schema validation in Phase 3)

## Design principles

- **Follow the code, not the README.** Verify every claim against actual source files.
- **Accuracy over completeness.** Report what you can verify. An honest gap is better than a plausible guess.
- **Calibrate depth.** Match the output length to the codebase complexity.
- **APIs mean all external interfaces.** REST, CLI, gRPC, WebSocket, library exports, background jobs — inventory them all.
- **Diagram must match prose.** If the Mermaid diagram and the written summary disagree, one is wrong.

## License

MIT
