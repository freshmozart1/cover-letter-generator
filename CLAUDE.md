# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`cover-letter-generator` is a TypeScript **library** (not a CLI or server — `main`/`types` point at `dist/`, no `bin` field) that generates AI-tailored cover letters:

1. Segments existing cover letters into 6 parts (`subject`, `salutation`, `introduction`, `mainBody`, `conclusion`, `greetings`) — first via heuristic regex parsing (`src/coverLetterSegmentation/segmentCoverLetterHeuristically.ts`), falling back to an LLM (`gpt-5.6-luna`) when confidence is low.
2. Embeds each non-empty segment via OpenAI embeddings (`text-embedding-3-small`); segments that are empty or whitespace-only (e.g. a subject the heuristic couldn't find) keep their text with no embedding.
3. Ranks stored example cover letters against a target job by weighted per-segment cosine similarity (`src/getTopX.ts`).
4. Generates a new cover letter with OpenAI's Responses API (`gpt-5.6-sol`) using the most similar examples as style references, against a strict JSON schema (`src/constants/segmentsSchema.ts`).

## Commands

- Build: For development builds run `npm run build:dev` (`tsc -p tsconfig.json`). For production builds run `npm run build:prod` — this is the one whose flat `dist/*.js` layout matches `package.json`'s `main`/`types` fields.
- Test: `npm test` (Node's built-in test runner via `OPENAI_API_KEY=test-key node --experimental-test-module-mocks --import tsx --test "test/**/*.test.ts"` — no Jest/Vitest/Mocha; the hardcoded key is a placeholder since the OpenAI client is never actually called — all tests mock it)
- Typecheck: `npm run typecheck` (checks both `tsconfig.json` and `tsconfig.test.json`)
- Lint: `npm run lint` (`eslint .`)
- Format: `npm run format` (`prettier --write .`)

There's no combined "check everything" script — use the `/verify` skill for that.

## Code style

- Prettier: single quotes, 4-space indentation (`.prettierrc` — both differ from Prettier defaults).
- TypeScript strict mode plus `noUncheckedIndexedAccess` — indexed array/object access is typed as possibly `undefined`, so expect and preserve the defensive `?? ` / existence checks already present in `src/`.
- `type: "commonjs"` in `package.json` despite `module`/`moduleResolution: "nodenext"` in `tsconfig.json` — this is intentional, not a bug to "fix".
- Three tsconfig files: `tsconfig.json` is the shared base (`rootDir: "."`, includes both `src/**` and `test/**`) — this is what `npm run build:dev` and `npm run typecheck`'s first pass use. `tsconfig.test.json` extends it unchanged, so `typecheck`'s second pass covers `test/**` too. `tsconfig.prod.json` extends the base but narrows back to `rootDir: "src"` / `include: ["src/**/*.ts"]`, producing the flat `dist/*.js` layout `package.json`'s `main`/`types` point at — that's the one anything published relies on.

## Environment

- `OPENAI_API_KEY` must be set — the OpenAI SDK client in `src/llm.ts` (`new OpenAI()`) reads it implicitly; it's never referenced directly in code.
- The `cosine-similarity` dependency installs from a GitHub tag, not the npm registry — `.npmrc` sets `allow-git=root` to permit this. Don't remove that setting when touching `.npmrc`.

## Git workflow

- Work on a feature branch and open a PR for review — do not commit directly to `main`.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, test, and both builds (`build:dev`, `build:prod`) automatically on every push/PR to `main`.
