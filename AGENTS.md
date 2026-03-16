# Instructions for AI coding agents (Cursor, Codex, etc.)

Treat **phaser-settings** as a **library with a stable public API**. This package is the single source of truth for settings schema, validation, persistence contract, and the settings modal UI. Applications must use only its public API and must not wrap or duplicate its resolution/validation behavior.

## Rules

- **Library boundary**: Only the public API from the package entrypoint may be used by apps. The public surface is defined in [src/index.ts](src/index.ts) and [PUBLIC_API.md](PUBLIC_API.md). Never import from non-public paths (e.g. `phaser-settings/validation`, `phaser-settings/ui/...`). Only `import … from 'phaser-settings'`.

- **Do not** modify integration semantics (lifecycle, singleton, validation, coercion) without updating tests and [docs/INTEGRATION.md](docs/INTEGRATION.md) (and [docs/API.md](docs/API.md) if the contract changes).

- **Do not** wrap settings calls in app-local compatibility layers or reimplement merge/validation/coercion unless explicitly requested by the user.

- **Prefer** changing the shared package over duplicating logic in app repos. If the app needs behavior the package does not support, propose an API or extension point in the shared package instead of patching in the app.

- **Extension points**: Customization must go through the documented extension points (`beforeSet`, `afterSet`, `onValidationError`, `onPersistenceError`, `migrate`, `onAction`, `onClose`, `theme`). See [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Anti-goals

- Do **not** simplify by inlining shared settings logic into app code.
- Do **not** add app-local caches around settings unless the user asks for it.
- Do **not** create convenience wrappers that change resolution or validation behavior.
- Do **not** convert explicit validation failures into silent defaults.

## Where the contract is written

- **Client contract and forbidden patterns**: [docs/INTEGRATION.md](docs/INTEGRATION.md)
- **Full API and lifecycle**: [docs/API.md](docs/API.md)
- **Exported symbols and stability**: [PUBLIC_API.md](PUBLIC_API.md)
