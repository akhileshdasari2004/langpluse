import { useEffect } from "react";
import { RunStreamMessageSchema } from "./schema";
import { useLiveRunStoreApi } from "./LiveRunStoreProvider";

const STREAM_EVENT_NAMES = [
  "snapshot",
  "append",
  "correction",
  "heartbeat",
  "completion",
  "stream-error",
] as const;

export function useRunEventStream({
  projectId,
  runId,
  timestamp,
  demo,
  enabled = true,
}: {
  projectId: string;
  runId: string;
  timestamp: Date;
  demo: boolean;
  enabled?: boolean;
}) {
  const store = useLiveRunStoreApi();

  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams({
      timestamp: timestamp.toISOString(),
      demo: demo ? "1" : "0",
    });
    const source = new EventSource(
      `/api/project/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/stream?${params.toString()}`,
    );

    const handleMessage = (rawEvent: Event) => {
      if (!(rawEvent instanceof MessageEvent)) return;
      try {
        const message = RunStreamMessageSchema.safeParse(
          JSON.parse(rawEvent.data as string),
        );
        if (message.success) {
          store.getState().actions.applyMessage(message.data);
        }
      } catch {
        // A malformed frame is isolated so one bad message cannot terminate
        // the authenticated stream or corrupt the local event buffer.
      }
    };

    for (const eventName of STREAM_EVENT_NAMES) {
      source.addEventListener(eventName, handleMessage);
    }
    source.onopen = () => {
      store.getState().actions.setConnectionState("LIVE");
    };
    source.onerror = () => {
      const status = store.getState().buffer.status;
      if (status !== "SUCCEEDED" && status !== "FAILED") {
        store.getState().actions.setConnectionState("RECONNECTING");
      }
    };

    const unsubscribe = store.subscribe((state, previous) => {
      if (
        state.connectionState === "COMPLETE" &&
        previous.connectionState !== "COMPLETE"
      ) {
        source.close();
      }
    });

    return () => {
      unsubscribe();
      for (const eventName of STREAM_EVENT_NAMES) {
        source.removeEventListener(eventName, handleMessage);
      }
      source.close();
    };
  }, [demo, enabled, projectId, runId, store, timestamp]);
}
