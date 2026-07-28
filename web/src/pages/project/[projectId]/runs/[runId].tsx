import { useRouter } from "next/router";
import { TracePage } from "@/src/components/trace/TracePage";
import { parseTraceTimestampFromQuery } from "@/src/utils/parseTraceTimestampFromQuery";

export default function AgentRun() {
  const router = useRouter();
  const runId = router.query.runId as string;
  const timestamp = parseTraceTimestampFromQuery(router.query.timestamp);

  return <TracePage traceId={runId} timestamp={timestamp} mode="run" />;
}
