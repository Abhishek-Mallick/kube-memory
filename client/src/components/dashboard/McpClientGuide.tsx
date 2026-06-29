import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { getMcpEndpointUrl } from "@/lib/api";

const clients = [
  {
    id: "cursor",
    label: "Cursor",
    hint: "Open Settings → MCP → Add new server, then paste the JSON below.",
    steps: ["Settings → MCP", "Add server", "Paste config", "Restart Cursor"],
  },
  {
    id: "vscode",
    label: "VS Code",
    hint: "Add to .vscode/mcp.json in your workspace or user-level MCP config.",
    steps: ["Create mcp.json", "Paste config", "Reload window", "Open Copilot MCP panel"],
  },
  {
    id: "claude",
    label: "Claude Desktop",
    hint: "Edit claude_desktop_config.json on macOS or %APPDATA%\\Claude on Windows.",
    steps: ["Open config file", "Add mcpServers block", "Restart Claude", "Verify tools appear"],
  },
] as const;

function buildSnippet(apiKey?: string) {
  return JSON.stringify(
    {
      mcpServers: {
        "kube-memory": {
          url: getMcpEndpointUrl(),
          headers: {
            Authorization: `Bearer ${apiKey ?? "km_your_api_key_here"}`,
          },
        },
      },
    },
    null,
    2,
  );
}

interface McpClientGuideProps {
  apiKey?: string;
  compact?: boolean;
}

export function McpClientGuide({ apiKey, compact }: McpClientGuideProps) {
  const config = useMemo(() => buildSnippet(apiKey), [apiKey]);

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
        <div>
          <h2 className="font-heading text-lg font-medium">Connect your IDE</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste this MCP config into your client. Replace the Bearer token if you have not copied your key yet.
          </p>
        </div>
      )}
      <Tabs defaultValue="cursor">
        <TabsList className="mb-4 h-9 w-fit">
          {clients.map((client) => (
            <TabsTrigger key={client.id} value={client.id} className="px-4">
              {client.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {clients.map((client) => (
          <TabsContent key={client.id} value={client.id} className="space-y-4">
            <p className="text-sm text-muted-foreground">{client.hint}</p>
            <ol className="grid gap-2 sm:grid-cols-2">
              {client.steps.map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[10px] font-medium">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="flex justify-end">
              <CopyButton value={config} label="Copy config" toastMessage="MCP config copied" />
            </div>
            <pre className="code-block max-h-72 overflow-auto whitespace-pre">{config}</pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
