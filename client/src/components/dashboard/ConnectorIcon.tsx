import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon, SlackIcon } from "@hugeicons/core-free-icons";
import type { ConnectorType } from "@/store/api/connectorsApi";
import { cn } from "@/lib/utils";

interface ConnectorIconProps {
  type: ConnectorType;
  className?: string;
}

function KubernetesLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.204 14.35l-1.85 3.2h3.7l-1.85-3.2zm-3.7-6.4l1.85 3.2 1.85-3.2H6.504zm7.4 0h-3.7l1.85 3.2 1.85-3.2zm-5.55 1.6l-1.85-3.2-1.85 3.2h3.7zm5.55 3.2l-1.85 3.2 1.85-3.2h-1.85zm-3.7 0l1.85 3.2 1.85-3.2h-3.7zM12 2.4L1.2 8.8v6.4L12 21.6l10.8-6.4V8.8L12 2.4z"
      />
    </svg>
  );
}

function PrometheusLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z"
      />
      <path fill="currentColor" d="M14.5 8.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S12.17 7 13 7s1.5.67 1.5 1.5z" />
    </svg>
  );
}

function ArgoCDLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C8.5 2 5.73 4.11 4.65 7.09L2 6.5l1.2 3.6L6.8 9l-1.5-1.5c.6-2.1 2.5-3.6 4.7-3.6 2.76 0 5 2.24 5 5 0 .9-.24 1.74-.66 2.47l1.73 1.73C16.74 12.74 17 11.41 17 10c0-2.76-2.24-5-5-5zm7.35 4.91C18.27 4.11 15.5 2 12 2v2c2.2 0 4.1 1.5 4.7 3.6L15.2 9l3.6 1.1L20 6.5l-2.65.41zM12 22c3.5 0 6.27-2.11 7.35-5.09L22 17.5l-1.2-3.6-3.6-1.1 1.5 1.5c-.6 2.1-2.5 3.6-4.7 3.6-2.76 0-5-2.24-5-5 0-.9.24-1.74.66-2.47L8.26 11.26C7.26 13.26 7 14.59 7 16c0 2.76 2.24 5 5 5zm-7.35-4.91C5.73 19.89 8.5 22 12 22v-2c-2.2 0-4.1-1.5-4.7-3.6L8.8 15l-3.6-1.1L4 17.5l2.65-.41z"
      />
    </svg>
  );
}

function PagerDutyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-7v4h3l-4 7z"
      />
    </svg>
  );
}

export function ConnectorIcon({ type, className }: ConnectorIconProps) {
  const iconClass = cn("size-5 shrink-0", className);

  switch (type) {
    case "kubernetes":
      return <KubernetesLogo className={iconClass} />;
    case "github":
      return <HugeiconsIcon icon={GithubIcon} strokeWidth={2} className={iconClass} />;
    case "slack":
      return <HugeiconsIcon icon={SlackIcon} strokeWidth={2} className={iconClass} />;
    case "pagerduty":
      return <PagerDutyLogo className={iconClass} />;
    case "prometheus":
      return <PrometheusLogo className={iconClass} />;
    case "argocd":
      return <ArgoCDLogo className={iconClass} />;
    default:
      return null;
  }
}
