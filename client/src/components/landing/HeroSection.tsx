import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroMemoryVisual } from "@/components/landing/HeroMemoryVisual";

interface HeroSectionProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  isAuthenticated: boolean;
}

export function HeroSection({ onGetStarted, onSignIn, isAuthenticated }: HeroSectionProps) {
  return (
    <section className="landing-section landing-hero min-h-[calc(100svh-50px)] flex items-center">
      <div className="landing-hero-grid">
        <div className="min-w-0 space-y-6">
          <p className="font-heading text-xs uppercase tracking-[0.18em] text-[var(--color-accent-signal)]">
            Organizational memory for DevOps agents
          </p>
          <h1 className="font-display text-4xl leading-[1.08] tracking-tight md:text-5xl break-words min-w-0">
            Infrastructure history your agents can actually recall.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            kube-memory persists incidents, fixes, and deploy outcomes as queryable MCP tools — so the next
            OOMKill or CrashLoopBackOff starts with context, not a blank prompt.
          </p>
          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Button asChild size="lg">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={onGetStarted}>
                  Get started free
                </Button>
                <Button size="lg" variant="outline" onClick={onSignIn}>
                  Sign in
                </Button>
              </>
            )}
            <Button asChild size="lg" variant="ghost">
              <Link to="/docs">Documentation</Link>
            </Button>
          </div>
        </div>
        <HeroMemoryVisual />
      </div>
    </section>
  );
}
