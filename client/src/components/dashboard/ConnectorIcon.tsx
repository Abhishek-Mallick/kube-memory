import type { ConnectorType } from "@/store/api/connectorsApi";
import { cn } from "@/lib/utils";
import googleCloudLogo from "@/assets/images/GoogleCloud.png";
import argocdLogo from "@/assets/images/ArgoCD.png";
import githubLogo from "@/assets/images/GitHub.png";
import kubernetesLogo from "@/assets/images/Kubernetes.png";
import pagerdutyLogo from "@/assets/images/Pagerduty.png";
import prometheusLogo from "@/assets/images/Prometheus.png";
import slackLogo from "@/assets/images/Slack.png";
import linearLogo from "@/assets/images/linear.png";
import notionLogo from "@/assets/images/notion.png";
import awsLogo from "@/assets/images/aws.webp";
import azureLogo from "@/assets/images/Azure.png";

interface ConnectorIconProps {
  type: ConnectorType;
  className?: string;
}

const CONNECTOR_LOGOS: Record<ConnectorType, string> = {
  kubernetes: kubernetesLogo,
  github: githubLogo,
  slack: slackLogo,
  pagerduty: pagerdutyLogo,
  prometheus: prometheusLogo,
  argocd: argocdLogo,
  gcp: googleCloudLogo,
  linear: linearLogo,
  notion: notionLogo,
  jira: "https://cdn.simpleicons.org/jira/0052CC",
  datadog: "https://cdn.simpleicons.org/datadog/632CA6",
  splunk: "https://cdn.simpleicons.org/splunk/65A637",
  aws: awsLogo,
  azure: azureLogo,
};

export function ConnectorIcon({ type, className }: ConnectorIconProps) {
  const src = CONNECTOR_LOGOS[type];
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cn(
        "size-5 shrink-0 object-contain",
        (type === "github" || type === "linear") && "dark:invert",
        className,
      )}
    />
  );
}
