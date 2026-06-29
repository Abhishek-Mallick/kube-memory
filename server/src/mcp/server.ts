import { McpServer } from "@modelcontextprotocol/server";
import { registerMemoryTools } from "./tools/memory.js";
import { registerKubernetesTools } from "./tools/kubernetes.js";
import { registerGitHubTools } from "./tools/github.js";
import { registerSlackTools } from "./tools/slack.js";
import { registerPagerDutyTools } from "./tools/pagerduty.js";
import { registerPrometheusTools } from "./tools/prometheus.js";
import { registerArgoCDTools } from "./tools/argocd.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "kube-memory",
    version: "0.0.1",
  });

  registerMemoryTools(server);
  registerKubernetesTools(server);
  registerGitHubTools(server);
  registerSlackTools(server);
  registerPagerDutyTools(server);
  registerPrometheusTools(server);
  registerArgoCDTools(server);

  return server;
}
