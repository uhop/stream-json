# Contributing to stream-json

Thank you for your interest in contributing!

## Getting started

This project uses a git submodule for the wiki. Clone recursively:

```bash
git clone --recursive git@github.com:uhop/stream-json.git
cd stream-json
npm install
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the module map and dependency graph.

## Development workflow

1. Make your changes.
2. Lint: `npm run lint:fix`
3. Test: `npm test`
4. Type-check: `npm run ts-check`

## Code style

- CommonJS (`require()`/`module.exports`) in source, ESM (`import`) in tests (`.mjs`).
- Formatted with Prettier — see `.prettierrc` for settings.
- One runtime dependency: `stream-chain`. Do not add others.
- Keep `.js` and `.d.ts` files in sync for all modules under `src/`.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
