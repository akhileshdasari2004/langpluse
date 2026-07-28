import { createContext, useContext, type ReactNode } from "react";
import type { AgentExecutionProjection } from "@langfuse/shared";

const RunProjectionContext = createContext<AgentExecutionProjection | null>(
  null,
);

export function RunProjectionProvider({
  projection,
  children,
}: {
  projection: AgentExecutionProjection;
  children: ReactNode;
}) {
  return (
    <RunProjectionContext.Provider value={projection}>
      {children}
    </RunProjectionContext.Provider>
  );
}

export function useRunProjection() {
  const projection = useContext(RunProjectionContext);
  if (!projection) {
    throw new Error(
      "useRunProjection must be used within RunProjectionProvider",
    );
  }
  return projection;
}
