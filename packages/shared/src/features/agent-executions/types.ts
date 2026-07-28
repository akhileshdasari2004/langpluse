import type {
  ObservationLevelType,
  ObservationType,
} from "../../domain/observations";
import type { MetadataDomain } from "../../domain/traces";

export type AgentExecutionSourceEvent = {
  id: string;
  parentObservationId: string | null;
  name: string | null;
  type: ObservationType;
  level: ObservationLevelType;
  statusMessage: string | null;
  startTime: Date;
  endTime: Date | null;
  version: string | null;
  metadata: MetadataDomain;
};

export type AgentExecutionSourceTrace = {
  id: string;
  projectId: string;
  name: string | null;
  timestamp: Date;
  metadata: MetadataDomain;
  version: string | null;
};
