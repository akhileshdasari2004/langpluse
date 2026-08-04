export type ConnectorProvider = "GMAIL" | "SALESFORCE" | "HUBSPOT" | "PRINTAVO";
export type ActionDispatchInput = { projectId: string; actionId: string; idempotencyKey: string; actionType: string; payload: unknown };
export class ConnectorNotConfiguredError extends Error { constructor(public readonly provider: ConnectorProvider) { super(`${provider} connector is not configured.`); this.name = "ConnectorNotConfiguredError"; } }
export interface ActionConnector { readonly provider: ConnectorProvider; dispatch(input: ActionDispatchInput): Promise<{ externalReference: string }>; reconcile(input: Pick<ActionDispatchInput, "projectId" | "actionId" | "idempotencyKey">): Promise<{ externalReference: string } | null>; }
class UnconfiguredConnector implements ActionConnector {
  constructor(readonly provider: ConnectorProvider) {}
  async dispatch(): Promise<{ externalReference: string }> { throw new ConnectorNotConfiguredError(this.provider); }
  async reconcile(): Promise<null> { throw new ConnectorNotConfiguredError(this.provider); }
}
export class GmailConnector extends UnconfiguredConnector { constructor() { super("GMAIL"); } }
export class SalesforceConnector extends UnconfiguredConnector { constructor() { super("SALESFORCE"); } }
export class HubSpotConnector extends UnconfiguredConnector { constructor() { super("HUBSPOT"); } }
export class PrintavoConnector extends UnconfiguredConnector { constructor() { super("PRINTAVO"); } }
export class ConnectorRegistry {
  private readonly connectors = new Map<ConnectorProvider, ActionConnector>();
  constructor(connectors: ActionConnector[] = [new GmailConnector(), new SalesforceConnector(), new HubSpotConnector(), new PrintavoConnector()]) { connectors.forEach((connector) => this.connectors.set(connector.provider, connector)); }
  get(provider: ConnectorProvider) { const connector = this.connectors.get(provider); if (!connector) throw new ConnectorNotConfiguredError(provider); return connector; }
}
