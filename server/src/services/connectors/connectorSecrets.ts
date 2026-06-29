import { Connector, type ConnectorType } from "../../db/models/Connector.js";
import { decryptSecret } from "../../utils/encryption.js";

export async function getConnectorSecret(
  workspaceId: string,
  type: ConnectorType,
): Promise<{ config: Record<string, unknown>; secret?: string } | null> {
  const connector = await Connector.findOne({ workspaceId, type, enabled: true });
  if (!connector) return null;
  return {
    config: connector.config as Record<string, unknown>,
    secret: connector.secretEncrypted ? decryptSecret(connector.secretEncrypted) : undefined,
  };
}
