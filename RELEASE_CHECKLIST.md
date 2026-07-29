# Langpluse Release Checklist

**Audit date:** 2026-07-29
**Release status:** BLOCKED — runtime configuration and browser verification are
not available to this checkout.

## Toolchain

- [x] Project toolchain located: Node `v24.10.0` and pnpm `11.10.0`.
- [x] `pnpm run agents:check` completed successfully.
- [x] `pnpm run lint` completed with exit code `0`.
- [x] `pnpm run typecheck` completed with exit code `0`.
- [x] `pnpm run build:check` completed with exit code `0`.
- [x] `pnpm run build` completed with exit code `0`.
- [x] `pnpm run scan:client-bundle` completed with exit code `0`.
- [x] Changed-file formatting passed with Prettier.
- [x] `git diff --check` passed.
- [x] The Mission Control SVG product mark passed XML validation.

## Required verification still blocked

- [ ] Focused client navigation test:
      `web/src/components/layouts/routes.clienttest.tsx` cannot start because
      `DATABASE_URL`, `NEXTAUTH_URL`, `SALT`, `CLICKHOUSE_URL`,
      `CLICKHOUSE_USER`, and `CLICKHOUSE_PASSWORD` are absent from the shell.
- [ ] There is no `.env`, `.env.local`, or `.env.test` file in or immediately
      above this checkout. Do not add substitute secrets or disable env
      validation to make tests pass.
- [ ] Browser review is unavailable because the required Node REPL browser
      interface is not exposed to this session. Therefore responsive layout,
      loading states, keyboard flows, screen-reader behavior, console errors,
      and hydrated application behavior have not been verified.
- [ ] Docker is not installed in this execution environment, so service health
      cannot be independently inspected here.
- [ ] Authenticated API, seeded data, route, timeline, replay, simulation, and
      dashboard flow verification require the configured runtime environment.

## Product-surface status

- [x] Primary navigation labels use Mission Control language: Dashboard, Runs,
      and Execution Groups.
- [x] The global product mark is Mission Control artwork.
- [x] Stale public vendor documentation and release links were removed from the
      authenticated sidebar.
- [x] The founder demo script uses the current Dashboard and Runs labels.
- [ ] The requested Tool Explorer, Execution Coach, and Analytics destinations
      are not production-complete standalone modules. They must not be exposed
      as dead primary-navigation links.
- [ ] Full founder-facing terminology/brand retirement remains incomplete;
      protocol-level and compatibility terms are intentionally retained until a
      versioned retirement proposal has evidence and approval.

## Release decision

**Do not release or commit this work as production-ready yet.** Before release,
provide the configured environment through the approved secret-management path,
make an authenticated browser session available, rerun the failed client test,
run the seeded Northstar Logistics workflow end to end, and complete the
remaining PRD modules and compatibility tests described in `FINAL_AUDIT.md`.
