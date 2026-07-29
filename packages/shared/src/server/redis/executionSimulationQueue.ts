import { Queue } from "bullmq";
import { logger } from "../logger";
import { QueueName, type TQueueJobTypes } from "../queues";
import { createBullMQQueueOptionsWithRedis } from "./redis";

export class ExecutionSimulationQueue {
  private static instance: Queue<
    TQueueJobTypes[QueueName.ExecutionSimulation]
  > | null = null;

  public static getInstance(): Queue<
    TQueueJobTypes[QueueName.ExecutionSimulation]
  > | null {
    if (ExecutionSimulationQueue.instance) {
      return ExecutionSimulationQueue.instance;
    }

    const queueOptionsWithRedis = createBullMQQueueOptionsWithRedis(
      QueueName.ExecutionSimulation,
    );
    ExecutionSimulationQueue.instance = queueOptionsWithRedis
      ? new Queue<TQueueJobTypes[QueueName.ExecutionSimulation]>(
          QueueName.ExecutionSimulation,
          {
            ...queueOptionsWithRedis,
            defaultJobOptions: {
              removeOnComplete: true,
              removeOnFail: 10_000,
              attempts: 3,
              backoff: { type: "exponential", delay: 2_000 },
            },
          },
        )
      : null;

    ExecutionSimulationQueue.instance?.on("error", (error) => {
      logger.error("ExecutionSimulationQueue error", error);
    });
    return ExecutionSimulationQueue.instance;
  }
}
