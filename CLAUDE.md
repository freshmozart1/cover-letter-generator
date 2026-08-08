# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`cover-letter-generator` is a TypeScript **library** (not a CLI or server — `main`/`types` point at `dist/`, no `bin` field) that generates AI-tailored cover letters:

1. Segments existing cover letters into 6 parts (`subject`, `salutation`, `introduction`, `mainBody`, `conclusion`, `greetings`) — first via heuristic regex parsing (`src/coverLetterSegmentation/segmentCoverLetterHeuristically.ts`), falling back to an LLM (`gpt-5.6-luna`) when confidence is low.
2. Embeds each segment via OpenAI embeddings (`text-embedding-3-small`).
3. Ranks stored example cover letters against a target job by weighted per-segment cosine similarity (`src/getTopX.ts`).
4. Generates a new cover letter with OpenAI's Responses API (`gpt-5.6-sol`) using the most similar examples as style references, against a strict JSON schema (`src/segmentsSchema.ts`).

## Commands

- Build: `npm run build` (`tsc -p tsconfig.json`)
- Test: `npm test` (Node's built-in test runner via `node --import tsx --test "test/*.test.ts"` — no Jest/Vitest/Mocha)
- Typecheck: `npm run typecheck` (checks both `tsconfig.json` and `tsconfig.test.json`)
- Lint: no npm script exists yet — run directly with `npx eslint .`
- Format: no npm script exists yet — run directly with `npx prettier --write .`

There's no combined "check everything" script — use the `/verify` skill for that.

## Code style

- Prettier: single quotes, 4-space indentation (`.prettierrc` — both differ from Prettier defaults).
- TypeScript strict mode plus `noUncheckedIndexedAccess` — indexed array/object access is typed as possibly `undefined`, so expect and preserve the defensive `?? ` / existence checks already present in `src/`.
- `type: "commonjs"` in `package.json` despite `module`/`moduleResolution: "nodenext"` in `tsconfig.json` — this is intentional, not a bug to "fix".
- Two tsconfig files: `tsconfig.json` builds `src/` only (`rootDir: "src"`, used for `dist/` emit). `tsconfig.test.json` extends it and widens `rootDir` to `.` purely so `test/**` can be typechecked (`--noEmit`) without affecting the real build's output layout.

## Environment

- `OPENAI_API_KEY` must be set — the OpenAI SDK client in `src/llm.ts` (`new OpenAI()`) reads it implicitly; it's never referenced directly in code.
- The `cosine-similarity` dependency installs from a GitHub tag, not the npm registry — `.npmrc` sets `allow-git=root` to permit this. Don't remove that setting when touching `.npmrc`.

## Git workflow

- Work on a feature branch and open a PR for review — do not commit directly to `main`.
