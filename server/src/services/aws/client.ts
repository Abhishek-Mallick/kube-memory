// SECURITY-REVIEW: Calls AWS APIs with dashboard-stored credentials and optional role assumption.
import { CloudWatchClient, DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient, GetQueryResultsCommand, StartQueryCommand } from "@aws-sdk/client-cloudwatch-logs";
import { ResourceGroupsTaggingAPIClient, GetResourcesCommand } from "@aws-sdk/client-resource-groups-tagging-api";
import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { requireConnector } from "../connectors/connectorHttp.js";

interface AwsSecret { accessKeyId: string; secretAccessKey: string; sessionToken?: string }

function parseRegion(config: Record<string, unknown>): string {
  const region = String(config.region ?? "us-east-1").trim();
  if (!/^[a-z0-9-]+$/i.test(region)) throw new Error("Invalid AWS region");
  return region;
}

function parseRoleArn(config: Record<string, unknown>): string {
  const roleArn = String(config.roleArn ?? "").trim();
  if (!roleArn) return "";
  if (!/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/.test(roleArn)) throw new Error("Invalid read-only role ARN");
  return roleArn;
}

async function awsConfig(workspaceId: string) {
  const { config, secret } = await requireConnector(workspaceId, "aws");
  let credentials: AwsSecret;
  try { credentials = JSON.parse(secret) as AwsSecret; } catch { throw new Error("AWS credentials must be JSON with accessKeyId and secretAccessKey"); }
  if (!credentials.accessKeyId || !credentials.secretAccessKey) throw new Error("AWS credentials must include accessKeyId and secretAccessKey");
  const region = parseRegion(config);
  const roleArn = parseRoleArn(config);
  if (!roleArn) return { region, credentials };
  const sts = new STSClient({ region, credentials });
  const assumed = await sts.send(new AssumeRoleCommand({ RoleArn: roleArn, RoleSessionName: "kube-memory-readonly", DurationSeconds: 3600 }));
  const roleCredentials = assumed.Credentials;
  if (!roleCredentials?.AccessKeyId || !roleCredentials.SecretAccessKey) throw new Error("AWS role assumption returned incomplete credentials");
  return { region, credentials: { accessKeyId: roleCredentials.AccessKeyId, secretAccessKey: roleCredentials.SecretAccessKey, sessionToken: roleCredentials.SessionToken } };
}

export async function testAwsConnection(workspaceId: string): Promise<void> {
  const config = await awsConfig(workspaceId);
  await new STSClient(config).send(new GetCallerIdentityCommand({}));
}

export async function getServiceContext(options: { workspaceId: string; service: string; region?: string }): Promise<unknown> {
  const config = await awsConfig(options.workspaceId);
  const client = new ResourceGroupsTaggingAPIClient({ ...config, region: options.region ?? config.region });
  const result = await client.send(new GetResourcesCommand({ TagFilters: [{ Key: "service", Values: [options.service] }], ResourcesPerPage: 50 }));
  return { service: options.service, resources: result.ResourceTagMappingList ?? [] };
}

export async function listAlarms(options: { workspaceId: string; state?: "OK" | "ALARM" | "INSUFFICIENT_DATA"; alarmNamePrefix?: string; region?: string; limit?: number }): Promise<unknown> {
  const config = await awsConfig(options.workspaceId);
  const client = new CloudWatchClient({ ...config, region: options.region ?? config.region });
  const result = await client.send(new DescribeAlarmsCommand({ StateValue: options.state, AlarmNamePrefix: options.alarmNamePrefix, MaxRecords: options.limit ?? 25 }));
  return { metricAlarms: result.MetricAlarms ?? [], compositeAlarms: result.CompositeAlarms ?? [] };
}

export async function searchLogs(options: { workspaceId: string; logGroupNames: string[]; query: string; startTime: string; endTime: string; region?: string; limit?: number }): Promise<unknown> {
  const config = await awsConfig(options.workspaceId);
  const client = new CloudWatchLogsClient({ ...config, region: options.region ?? config.region });
  const startTime = Math.floor(new Date(options.startTime).getTime() / 1000);
  const endTime = Math.floor(new Date(options.endTime).getTime() / 1000);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime >= endTime) throw new Error("startTime and endTime must be valid ISO dates with start before end");
  const started = await client.send(new StartQueryCommand({ logGroupNames: options.logGroupNames, queryString: options.query, startTime, endTime, limit: options.limit ?? 25 }));
  if (!started.queryId) throw new Error("AWS did not return a CloudWatch Logs Insights query ID");
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await client.send(new GetQueryResultsCommand({ queryId: started.queryId }));
    if (result.status === "Complete") return { queryId: started.queryId, results: result.results ?? [], statistics: result.statistics };
    if (["Failed", "Cancelled", "Timeout", "Unknown"].includes(result.status ?? "")) throw new Error(`CloudWatch Logs Insights query ${result.status?.toLowerCase()}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("CloudWatch Logs Insights query timed out after 5 seconds");
}

export async function isAwsAvailable(workspaceId: string): Promise<boolean> { try { await requireConnector(workspaceId, "aws"); return true; } catch { return false; } }
