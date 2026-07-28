import { api } from "@/src/utils/api";

export function useMissionControlDashboard(params: {
  projectId: string;
  from: Date;
  to: Date;
}) {
  return api.agentExecutions.getDashboardSummary.useQuery(
    {
      projectId: params.projectId,
      from: params.from,
      to: params.to,
    },
    {
      enabled: Boolean(params.projectId),
      refetchInterval: 5_000,
      staleTime: 4_000,
      refetchIntervalInBackground: false,
      placeholderData: (previousData) => previousData,
    },
  );
}
