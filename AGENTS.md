# Agents.md

## Code Style
### Structure and Clarity

- Never-nesting: early returns, flat code, minimal indentation. Break complex operations into well-named helpers.
- No dynamic imports unless absolutely necessary.

### DRY

- Extract repeated logic into utility functions.
- Reusable hooks / higher-order components for UI patterns.
- Shared validators, centralized error handling, single source of truth for business rules.
- Shared typing system with interfaces/types extending common base definitions.
- Abstraction layers for external API interactions.
