import * as k8s from "@kubernetes/client-node";
import { getEnv } from "../../config/env.js";
import { getConnectorSecret } from "../connectors/connectorSecrets.js";

let globalKubeConfig: k8s.KubeConfig | null = null;

function loadGlobalKubeConfig(): k8s.KubeConfig {
  if (globalKubeConfig) return globalKubeConfig;

  const kc = new k8s.KubeConfig();
  const encoded = getEnv().KUBECONFIG_BASE64;

  if (encoded) {
    const yaml = Buffer.from(encoded, "base64").toString("utf8");
    kc.loadFromString(yaml);
  } else {
    kc.loadFromDefault();
  }

  globalKubeConfig = kc;
  return kc;
}

export function getCoreV1ApiForKubeconfig(kubeconfigYaml: string): k8s.CoreV1Api {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(kubeconfigYaml);
  return kc.makeApiClient(k8s.CoreV1Api);
}

async function resolveCoreV1Api(workspaceId?: string): Promise<k8s.CoreV1Api | null> {
  if (workspaceId) {
    const connector = await getConnectorSecret(workspaceId, "kubernetes");
    if (connector?.secret) {
      return getCoreV1ApiForKubeconfig(connector.secret);
    }
  }

  const encoded = getEnv().KUBECONFIG_BASE64;
  if (encoded) {
    return getCoreV1ApiForKubeconfig(Buffer.from(encoded, "base64").toString("utf8"));
  }

  try {
    return loadGlobalKubeConfig().makeApiClient(k8s.CoreV1Api);
  } catch {
    return null;
  }
}

export function isKubernetesConfigured(): boolean {
  return Boolean(getEnv().KUBECONFIG_BASE64);
}

export function getCoreV1Api(): k8s.CoreV1Api {
  return loadGlobalKubeConfig().makeApiClient(k8s.CoreV1Api);
}

export async function getPodLogs(options: {
  name: string;
  namespace?: string;
  container?: string;
  tail?: number;
  workspaceId?: string;
}): Promise<string> {
  const api = await resolveCoreV1Api(options.workspaceId);
  if (!api) {
    throw new Error("Kubernetes is not configured");
  }

  const namespace = options.namespace ?? "default";
  const response = await api.readNamespacedPodLog({
    name: options.name,
    namespace,
    container: options.container,
    tailLines: options.tail ?? 100,
  });
  return typeof response === "string" ? response : String(response);
}

export async function listEvents(options: {
  namespace?: string;
  fieldSelector?: string;
  workspaceId?: string;
}): Promise<k8s.CoreV1Event[]> {
  const api = await resolveCoreV1Api(options.workspaceId);
  if (!api) {
    throw new Error("Kubernetes is not configured");
  }

  if (options.namespace) {
    const response = await api.listNamespacedEvent({
      namespace: options.namespace,
      fieldSelector: options.fieldSelector,
    });
    return response.items ?? [];
  }

  const response = await api.listEventForAllNamespaces({
    fieldSelector: options.fieldSelector,
  });
  return response.items ?? [];
}
