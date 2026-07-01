import { InstancesClient } from "@google-cloud/compute";
import { GoogleAuth } from "google-auth-library";
import { getEnv } from "../../config/env.js";
import { requireConnector } from "../connectors/connectorHttp.js";

interface GcpTokenSecret {
  refresh_token?: string;
  access_token?: string;
  expiry_date?: number;
}

function projectFromConfig(config: Record<string, unknown>, project?: string): string {
  const resolved = project ?? config.projectId;
  if (!resolved || typeof resolved !== "string") {
    throw new Error("GCP project ID is required (set default projectId in connector config or pass project)");
  }
  return resolved;
}

function normalizeInstance(instance: Record<string, unknown>, zone?: string) {
  const machineType = String(instance.machineType ?? "");
  const networkInterfaces = Array.isArray(instance.networkInterfaces)
    ? instance.networkInterfaces.map((ni: Record<string, unknown>) => ({
        network: ni.network,
        subnetwork: ni.subnetwork,
        networkIP: ni.networkIP,
        accessConfigs: ni.accessConfigs,
      }))
    : [];

  return {
    id: instance.id,
    name: instance.name,
    status: instance.status,
    zone: zone ?? extractZoneFromUrl(String(instance.zone ?? "")),
    machineType: machineType.split("/").pop() ?? machineType,
    creationTimestamp: instance.creationTimestamp,
    labels: instance.labels ?? {},
    networkInterfaces,
    metadata: instance.metadata,
    disks: instance.disks,
    tags: instance.tags,
  };
}

function extractZoneFromUrl(zoneUrl: string): string {
  const parts = zoneUrl.split("/");
  return parts[parts.length - 1] ?? zoneUrl;
}

async function getInstancesClient(workspaceId: string): Promise<InstancesClient> {
  const { secret } = await requireConnector(workspaceId, "gcp");
  const tokens = JSON.parse(secret) as GcpTokenSecret;
  const env = getEnv();

  const auth = new GoogleAuth({
    credentials: {
      type: "authorized_user",
      client_id: env.GCP_OAUTH_CLIENT_ID!,
      client_secret: env.GCP_OAUTH_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
    },
  });

  return new InstancesClient({ auth });
}

export async function isGcpAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "gcp");
    return true;
  } catch {
    return false;
  }
}

export async function listInstances(options: {
  workspaceId: string;
  project?: string;
  zone?: string;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");
  const project = projectFromConfig(config, options.project);
  const client = await getInstancesClient(options.workspaceId);

  if (options.zone) {
    const [instances] = await client.list({
      project,
      zone: options.zone,
    });
    return {
      project,
      zone: options.zone,
      instances: (instances ?? []).map((i) =>
        normalizeInstance(i as unknown as Record<string, unknown>, options.zone),
      ),
    };
  }

  const instances: unknown[] = [];
  for await (const [zoneKey, zoneData] of client.aggregatedListAsync({ project })) {
    const zoneInstances = zoneData.instances ?? [];
    const zoneName = zoneKey.replace("zones/", "");
    for (const inst of zoneInstances) {
      instances.push(normalizeInstance(inst as unknown as Record<string, unknown>, zoneName));
    }
  }

  return { project, instances };
}

export async function getInstance(options: {
  workspaceId: string;
  project?: string;
  zone: string;
  instance: string;
}): Promise<unknown> {
  const { config } = await requireConnector(options.workspaceId, "gcp");
  const project = projectFromConfig(config, options.project);
  const client = await getInstancesClient(options.workspaceId);

  const [inst] = await client.get({
    project,
    zone: options.zone,
    instance: options.instance,
  });

  if (!inst) {
    throw new Error(`Instance ${options.instance} not found in ${options.zone}`);
  }

  return normalizeInstance(inst as unknown as Record<string, unknown>, options.zone);
}

export async function testGcpConnection(workspaceId: string): Promise<void> {
  const { config } = await requireConnector(workspaceId, "gcp");
  const project = projectFromConfig(config);
  const client = await getInstancesClient(workspaceId);

  for await (const _entry of client.aggregatedListAsync({ project, maxResults: 1 })) {
    return;
  }
}
