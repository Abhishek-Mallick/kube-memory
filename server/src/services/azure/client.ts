// SECURITY-REVIEW: Calls Azure APIs with dashboard-stored service principal credentials.
import { ClientSecretCredential } from "@azure/identity";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { MonitorClient } from "@azure/arm-monitor";
import { LogsQueryClient, LogsQueryResultStatus } from "@azure/monitor-query-logs";
import { requireConnector } from "../connectors/connectorHttp.js";

interface AzureSecret {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isEnabledFlag(value: unknown): boolean {
  return value === true || value === "true" || value === "Enabled";
}

function parseSubscriptionId(config: Record<string, unknown>): string {
  const subscriptionId = String(config.subscriptionId ?? "").trim();
  if (!UUID_REGEX.test(subscriptionId)) throw new Error("Azure subscription ID must be a valid UUID");
  return subscriptionId;
}

function parseWorkspaceId(config: Record<string, unknown>, workspaceId?: string): string {
  const resolved = String(workspaceId ?? config.logAnalyticsWorkspaceId ?? "").trim();
  if (!UUID_REGEX.test(resolved)) {
    throw new Error("Log Analytics workspace ID is required (set in connector config or pass workspaceId)");
  }
  return resolved;
}

function parseServiceName(service: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(service)) throw new Error("Invalid service name");
  return service.replace(/'/g, "''");
}

async function azureContext(workspaceId: string) {
  const { config, secret } = await requireConnector(workspaceId, "azure");
  let credentials: AzureSecret;
  try {
    credentials = JSON.parse(secret) as AzureSecret;
  } catch {
    throw new Error("Azure credentials must be JSON with tenantId, clientId, and clientSecret");
  }
  if (!credentials.tenantId || !credentials.clientId || !credentials.clientSecret) {
    throw new Error("Azure credentials must include tenantId, clientId, and clientSecret");
  }
  if (!UUID_REGEX.test(credentials.tenantId) || !UUID_REGEX.test(credentials.clientId)) {
    throw new Error("Azure tenantId and clientId must be valid UUIDs");
  }

  const subscriptionId = parseSubscriptionId(config);
  const credential = new ClientSecretCredential(
    credentials.tenantId,
    credentials.clientId,
    credentials.clientSecret,
  );

  return { config, subscriptionId, credential };
}

export async function testAzureConnection(workspaceId: string): Promise<void> {
  const { subscriptionId, credential } = await azureContext(workspaceId);
  const client = new ResourceGraphClient(credential);
  await client.resources({
    subscriptions: [subscriptionId],
    query: "Resources | limit 1",
  });
}

export async function getServiceContext(options: { workspaceId: string; service: string }): Promise<unknown> {
  const { subscriptionId, credential } = await azureContext(options.workspaceId);
  const service = parseServiceName(options.service);
  const client = new ResourceGraphClient(credential);
  const result = await client.resources({
    subscriptions: [subscriptionId],
    query: `Resources | where tags['service'] == '${service}' | project id, name, type, resourceGroup, location, tags | limit 50`,
  });
  return { service: options.service, count: result.count, resources: result.data ?? [] };
}

export async function listAlerts(options: {
  workspaceId: string;
  namePrefix?: string;
  enabled?: boolean;
  limit?: number;
}): Promise<unknown> {
  const { subscriptionId, credential } = await azureContext(options.workspaceId);
  const client = new MonitorClient(credential, subscriptionId);
  const limit = options.limit ?? 25;
  const prefix = options.namePrefix?.trim();
  const metricAlerts: unknown[] = [];
  const scheduledQueryRules: unknown[] = [];

  for await (const alert of client.metricAlerts.listBySubscription()) {
    if (prefix && !alert.name?.startsWith(prefix)) continue;
    if (options.enabled !== undefined && alert.enabled !== options.enabled) continue;
    metricAlerts.push({
      id: alert.id,
      name: alert.name,
      enabled: alert.enabled,
      severity: alert.severity,
      description: alert.description,
      targetResourceType: alert.scopes,
    });
    if (metricAlerts.length >= limit) break;
  }

  if (metricAlerts.length < limit) {
    for await (const rule of client.scheduledQueryRules.listBySubscription()) {
      if (prefix && !rule.name?.startsWith(prefix)) continue;
      const ruleEnabled = isEnabledFlag(rule.enabled);
      if (options.enabled !== undefined && ruleEnabled !== options.enabled) continue;
      scheduledQueryRules.push({
        id: rule.id,
        name: rule.name,
        enabled: ruleEnabled,
        description: rule.description,
      });
      if (scheduledQueryRules.length >= limit - metricAlerts.length) break;
    }
  }

  return { metricAlerts, scheduledQueryRules };
}

export async function searchLogs(options: {
  workspaceId: string;
  query: string;
  startTime: string;
  endTime: string;
  workspaceIdOverride?: string;
  limit?: number;
}): Promise<unknown> {
  const { config, credential } = await azureContext(options.workspaceId);
  const workspaceId = parseWorkspaceId(config, options.workspaceIdOverride);
  const startTime = new Date(options.startTime);
  const endTime = new Date(options.endTime);
  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime()) || startTime >= endTime) {
    throw new Error("startTime and endTime must be valid ISO dates with start before end");
  }

  const limit = options.limit ?? 25;
  const query = `${options.query.trim()}\n| take ${limit}`;
  const client = new LogsQueryClient(credential);
  const result = await client.queryWorkspace(
    workspaceId,
    query,
    { startTime, endTime },
    { serverTimeoutInSeconds: 5 },
  );

  if (result.status === LogsQueryResultStatus.PartialFailure) {
    return {
      status: result.status,
      tables: result.partialTables,
      error: result.partialError,
      statistics: result.statistics,
    };
  }

  return {
    status: result.status,
    tables: result.tables,
    statistics: result.statistics,
  };
}

export async function isAzureAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "azure");
    return true;
  } catch {
    return false;
  }
}
