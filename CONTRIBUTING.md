# Contributing to Nabdh Backend

## Development Workflow

### Branch Strategy

```
main        ← Production (protected)
  develop   ← Integration (protected)
    feature/*   ← feature/my-feature
    fix/*       ← fix/bug-description
    chore/*     → chore/dependency-update
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add OTP verification endpoint
fix(booking): correct status transition on cancel
docs(readme): update quick start guide
chore(deps): upgrade prisma to 5.18
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

### PR Process

1. Create feature branch from `develop`
2. Write code + tests
3. Ensure `pnpm lint` and `pnpm test` pass
4. Open PR against `develop`
5. Request review from backend team
6. Squash-merge after approval

## Module Guidelines

- Each module has: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`
- Never import another module's internal files — use exported providers only
- Business logic stays in services — controllers only handle HTTP
- Add `// module: <name>` comments above Prisma models

## Code Style

- Strict TypeScript mode
- No `any` unless absolutely necessary
- Prettier + ESLint enforced via pre-commit hooks
- Run `pnpm lint` before committing
