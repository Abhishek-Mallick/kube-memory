import { z } from "zod";
import { memoryEpisodeSchema } from "../graph/index.js";

export const memoryRememberInputSchema = z.object({
  episode: memoryEpisodeSchema.optional(),
  text: z.string().min(1).optional(),
  datasetName: z.string().min(1).optional(),
}).refine((v) => v.episode !== undefined || v.text !== undefined, {
  message: "Either episode or text is required",
});

export const memoryRecallInputSchema = z.object({
  query: z.string().min(1),
  datasetName: z.string().min(1).optional(),
  topK: z.number().int().min(1).max(100).default(10),
  sessionId: z.string().optional(),
});

export const memoryForgetInputSchema = z.object({
  datasetName: z.string().min(1).optional(),
  everything: z.boolean().default(false),
});

export const predictRiskInputSchema = z.object({
  serviceName: z.string().min(1),
  query: z.string().optional(),
  datasetName: z.string().min(1).optional(),
});

export const k8sPodLogsInputSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().optional(),
  container: z.string().optional(),
  tail: z.number().int().min(1).max(500).default(100),
});

export const k8sGetEventsInputSchema = z.object({
  namespace: z.string().optional(),
  fieldSelector: z.string().optional(),
});

export const githubListIssuesInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "all"]).default("open"),
  labels: z.string().optional(),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubListPullRequestsInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "all"]).default("open"),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubListCommitsInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  sha: z.string().optional(),
  path: z.string().optional(),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubGetPullRequestInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  pullNumber: z.number().int().min(1),
});

export const githubListRepositoriesInputSchema = z.object({
  owner: z.string().min(1).optional(),
  type: z.enum(["all", "owner", "public", "private", "member"]).default("owner"),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubListRecentCommitsInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1).optional(),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const slackGetHistoryInputSchema = z.object({
  channel: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  oldest: z.string().optional(),
});

export const slackPostMessageInputSchema = z.object({
  channel: z.string().min(1).optional(),
  text: z.string().min(1),
});

export const slackListChannelsInputSchema = z.object({
  limit: z.number().int().min(1).max(200).default(100),
});

export const slackGetChannelInfoInputSchema = z.object({
  channel: z.string(),
})

export const slackGetRepliesInputSchema = z.object({
  channel: z.string(),
  threadTs: z.string().optional(), // Optional to be removed in the future, as it will be required to fetch replies for a specific thread 
  limit: z.number().int().min(1).max(200).optional(),
})

export const slackListUsersInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(), 
})

export const pagerdutyListIncidentsInputSchema = z.object({
  statuses: z.array(z.enum(["triggered", "acknowledged", "resolved"])).optional(),
  serviceIds: z.array(z.string()).optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  sortBy: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyGetIncidentInputSchema = z.object({
  incidentId: z.string().min(1),
});

export const pagerdutyGetIncidentLogEntriesInputSchema = z.object({
  incidentId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyListIncidentNotesInputSchema = z.object({
  incidentId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyListOncallsInputSchema = z.object({
  scheduleIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyListUsersInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
});

export const prometheusQueryInputSchema = z.object({
  query: z.string().min(1),
  time: z.string().optional(),
});

export const prometheusQueryRangeInputSchema = z.object({
  query: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  step: z.string().default("60s"),
});

export const prometheusListRulesInputSchema = z.object({
  type: z.enum(["alert", "record"]).optional(),
  ruleName: z.array(z.string()).optional(),
  ruleGroup: z.array(z.string()).optional(),
});

export const prometheusListLabelsInputSchema = z.object({
  match: z.array(z.string()).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const prometheusListLabelValuesInputSchema = z.object({
  labelName: z.string().min(1),
  match: z.array(z.string()).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const argocdGetApplicationInputSchema = z.object({
  name: z.string().min(1),
});

export const argocdSyncApplicationInputSchema = z.object({
  name: z.string().min(1),
  revision: z.string().optional(),
  prune: z.boolean().default(false),
});

export const argocdRollbackApplicationInputSchema = z.object({
  name: z.string().min(1),
  id: z.number().int().min(0),
});

export const incidentOpenInputSchema = z.object({
  serviceName: z.string().min(1),
  namespace: z.string().optional(),
  podName: z.string().optional(),
  title: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  githubOwner: z.string().optional(),
  githubRepo: z.string().optional(),
  argocdApplication: z.string().optional(),
  prometheusQuery: z.string().optional(),
  notifySlack: z.boolean().optional(),
  slackChannel: z.string().optional(),
  triggerPagerDuty: z.boolean().optional(),
  pagerDutyServiceId: z.string().optional(),
  rememberInMemory: z.boolean().optional(),
});

export const incidentGetInputSchema = z.object({
  incidentId: z.string().min(1),
});

export const incidentListInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

export const incidentUpdateInputSchema = z.object({
  incidentId: z.string().min(1),
  status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
  note: z.string().optional(),
  notifySlack: z.boolean().optional(),
  slackChannel: z.string().optional(),
});

export const pagerdutyCreateIncidentInputSchema = z.object({
  title: z.string().min(1),
  serviceId: z.string().min(1),
  body: z.string().optional(),
  urgency: z.enum(["high", "low"]).optional(),
});

export const gcpListInstancesInputSchema = z.object({
  project: z.string().optional(),
  zone: z.string().optional(),
});

export const gcpGetInstanceInputSchema = z.object({
  project: z.string().optional(),
  zone: z.string().min(1),
  instance: z.string().min(1),
});

export type MemoryRememberInput = z.infer<typeof memoryRememberInputSchema>;
export type MemoryRecallInput = z.infer<typeof memoryRecallInputSchema>;
export type MemoryForgetInput = z.infer<typeof memoryForgetInputSchema>;
export type PredictRiskInput = z.infer<typeof predictRiskInputSchema>;
