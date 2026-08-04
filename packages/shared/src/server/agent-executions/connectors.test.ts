import { describe, expect, it } from "vitest";
import { ConnectorNotConfiguredError, ConnectorRegistry } from "./connectors";
describe("connector registry", () => { it("fails closed without provider configuration", async () => { const connector = new ConnectorRegistry().get("GMAIL"); await expect(connector.dispatch({ projectId: "p", actionId: "a", idempotencyKey: "i", actionType: "SEND_EMAIL", payload: {} })).rejects.toBeInstanceOf(ConnectorNotConfiguredError); }); });
