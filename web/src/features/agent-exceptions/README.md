# Exception Desk

Run-scoped, auditable human decisions for unsafe or ambiguous agent work.

- `server/router.ts` owns project-scoped read and terminal resolution actions.
- `components/ExceptionDesk.tsx` owns query state, local selection intent and
  accessible resolution controls. It does not use effects or global state.
- The shared record/repository contract is under
  `packages/shared/src/features/agent-executions/exceptions.ts` and
  `packages/shared/src/server/agent-executions/exceptionsRepository.ts`.

The desk records an operator decision only. It never resumes an agent or calls
an external tool unless a future runtime explicitly consumes the record.
