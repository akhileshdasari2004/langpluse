import type {
  AgentExecutionEvent,
  AgentExecutionProjection,
  AgentExecutionStatus,
} from "@langfuse/shared";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  applyRunStreamMessage,
  createRunEventBuffer,
  type RunEventBuffer,
} from "./runEventBuffer";
import type { RunStreamMessage } from "./schema";

export type LiveRunConnectionState =
  | "CONNECTING"
  | "LIVE"
  | "RECONNECTING"
  | "COMPLETE"
  | "ERROR";

export type LiveRunStoreState = {
  buffer: RunEventBuffer;
  connectionState: LiveRunConnectionState;
  search: string;
  categoryFilter: AgentExecutionEvent["category"] | "ALL";
  statusFilter: AgentExecutionEvent["status"] | "ALL";
  expandedEventIds: Record<string, true>;
  autoFollow: boolean;
  unreadCount: number;
  streamError: string | null;
  actions: {
    applyMessage: (message: RunStreamMessage) => void;
    setConnectionState: (state: LiveRunConnectionState) => void;
    setSearch: (search: string) => void;
    setCategoryFilter: (
      category: AgentExecutionEvent["category"] | "ALL",
    ) => void;
    setStatusFilter: (status: AgentExecutionEvent["status"] | "ALL") => void;
    toggleExpanded: (eventId: string) => void;
    setAutoFollow: (enabled: boolean) => void;
    clearUnread: () => void;
  };
};

export type LiveRunStore = StoreApi<LiveRunStoreState>;

function connectionStateForStatus(
  status: AgentExecutionStatus,
): LiveRunConnectionState {
  return status === "SUCCEEDED" || status === "FAILED"
    ? "COMPLETE"
    : "CONNECTING";
}

export function createLiveRunStore(
  projection: AgentExecutionProjection,
): LiveRunStore {
  return createStore<LiveRunStoreState>((set, get) => ({
    buffer: createRunEventBuffer(projection),
    connectionState: connectionStateForStatus(projection.status),
    search: "",
    categoryFilter: "ALL",
    statusFilter: "ALL",
    expandedEventIds: {},
    autoFollow: true,
    unreadCount: 0,
    streamError: null,
    actions: {
      applyMessage: (message) => {
        const previous = get();
        const nextBuffer = applyRunStreamMessage(previous.buffer, message);
        const previousIds = new Set(
          previous.buffer.events.map((event) => event.id),
        );
        const appendedCount = nextBuffer.events.reduce(
          (count, event) => count + (previousIds.has(event.id) ? 0 : 1),
          0,
        );
        const connectionState =
          message.type === "completion"
            ? "COMPLETE"
            : message.type === "error"
              ? message.retryable
                ? "RECONNECTING"
                : "ERROR"
              : "LIVE";

        set({
          buffer: nextBuffer,
          connectionState,
          streamError: message.type === "error" ? message.message : null,
          unreadCount: previous.autoFollow
            ? 0
            : previous.unreadCount + appendedCount,
        });
      },
      setConnectionState: (connectionState) => {
        set({ connectionState });
      },
      setSearch: (search) => set({ search }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      toggleExpanded: (eventId) => {
        set((state) => {
          const expandedEventIds = { ...state.expandedEventIds };
          if (expandedEventIds[eventId]) delete expandedEventIds[eventId];
          else expandedEventIds[eventId] = true;
          return { expandedEventIds };
        });
      },
      setAutoFollow: (autoFollow) => {
        set({ autoFollow, unreadCount: autoFollow ? 0 : get().unreadCount });
      },
      clearUnread: () => set({ unreadCount: 0 }),
    },
  }));
}
