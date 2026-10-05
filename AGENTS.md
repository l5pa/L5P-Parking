# Agent instructions

Guidance for any coding agent working in this repo. Read this first.

## Project memory

There are two memory tiers; both are worth a look at session start.

1. **`MEMORY.md` in this repo** (if present) — versioned gotchas and rules that travel with
   the code. Anyone may add to it; keep entries short and commit them with the change.
2. **`~/agent-memory/L5P-Parking/MEMORY.md`** — Naoya's personal, cross-agent working memory
   (a private git repo outside this one). It is a short index that points at topic files
   worth opening for the task at hand. Claude Code writes there automatically. **Other agents
   (Codex included) may write too.** When you learn something durable — a gotcha, a decision,
   a rule Naoya stated, the state of an in-flight project — record it before you finish:
   - Create `~/agent-memory/L5P-Parking/<type>-<slug>.md` where `<type>` is `feedback`,
     `project`, or `reference`, with YAML frontmatter `name`, `description` (one line), and
     `metadata: {type: <type>, source: <agent>, <date>}`, then a short body: the fact,
     **Why**, **How to apply**.
   - Add one line to `MEMORY.md`: `- [Title](file.md) — hook`. Append; never rewrite or
     reorder the index, never delete another entry. Keep the index under 200 lines.
   - Update an existing topic file in place when the fact changes; don't fork it.
   - No secrets, ever: store the name of the 1Password item or env var, not the value.
   Commits are automatic (a hook commits and pushes the memory repo); don't run git there.
