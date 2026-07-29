import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { AgentExecutionProjection } from "@langfuse/shared";
import {
  createLiveRunStore,
  type LiveRunStore,
  type LiveRunStoreState,
} from "./liveRunStore";

const LiveRunStoreContext = createContext<LiveRunStore | null>(null);

export function LiveRunStoreProvider({
  children,
  projection,
}: {
  children: ReactNode;
  projection: AgentExecutionProjection;
}) {
  const [store] = useState(() => createLiveRunStore(projection));
  return (
    <LiveRunStoreContext.Provider value={store}>
      {children}
    </LiveRunStoreContext.Provider>
  );
}

export function useLiveRunStore<TValue>(
  selector: (state: LiveRunStoreState) => TValue,
): TValue {
  const store = useContext(LiveRunStoreContext);
  if (!store) {
    throw new Error("useLiveRunStore must be used within LiveRunStoreProvider");
  }
  return useStore(store, selector);
}

export function useLiveRunStoreApi(): LiveRunStore {
  const store = useContext(LiveRunStoreContext);
  if (!store) {
    throw new Error(
      "useLiveRunStoreApi must be used within LiveRunStoreProvider",
    );
  }
  return store;
}
