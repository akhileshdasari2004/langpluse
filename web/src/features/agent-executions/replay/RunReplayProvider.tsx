import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AgentExecutionEvent } from "@langfuse/shared";
import { useStore } from "zustand";
import {
  createPlayheadStore,
  type PlayheadStore,
} from "@/src/components/trace/contexts/playheadStore";
import { useLiveRunStore } from "../live/LiveRunStoreProvider";
import { useRunProjection } from "../components/RunProjectionContext";
import { activeReplayEvent, buildRunReplayGeometry } from "./replayOrdering";

const RunReplayContext = createContext<PlayheadStore | null>(null);

export function RunReplayProvider({ children }: { children: ReactNode }) {
  const buffer = useLiveRunStore((state) => state.buffer);
  const projection = useRunProjection();
  const geometry = useMemo(
    () =>
      buildRunReplayGeometry({
        events: buffer.events,
        startedAt: projection.startedAt,
        endedAt: buffer.endedAt,
      }),
    [buffer.endedAt, buffer.events, projection.startedAt],
  );
  const [store] = useState(() => {
    const created = createPlayheadStore();
    created.getState().actions.syncTrace({ ...geometry, hard: true });
    return created;
  });
  useEffect(() => {
    store.getState().actions.syncTrace({ ...geometry, hard: false });
  }, [geometry, store]);
  useEffect(() => () => store.getState().actions.pause(), [store]);
  return (
    <RunReplayContext.Provider value={store}>
      {children}
    </RunReplayContext.Provider>
  );
}

export function useRunReplayStore<T>(
  selector: (state: ReturnType<PlayheadStore["getState"]>) => T,
) {
  const store = useContext(RunReplayContext);
  if (!store)
    throw new Error("useRunReplayStore must be used within RunReplayProvider");
  return useStore(store, selector);
}

export function useRunReplayActions() {
  const store = useContext(RunReplayContext);
  if (!store)
    throw new Error(
      "useRunReplayActions must be used within RunReplayProvider",
    );
  return store.getState().actions;
}

export function useActiveRunReplayEvent(): AgentExecutionEvent | null {
  const events = useLiveRunStore((state) => state.buffer.events);
  const activeIds = useRunReplayStore((state) => state.activeIds);
  return useMemo(
    () => activeReplayEvent(events, activeIds),
    [activeIds, events],
  );
}
