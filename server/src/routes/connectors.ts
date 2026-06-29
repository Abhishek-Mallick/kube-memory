import { Router } from "express";
import { connectorTypes, Connector } from "../db/models/Connector.js";
import {
  connectorTypeParamSchema,
  connectorUpsertSchema,
} from "../schemas/api/connectors.js";
import { sessionAuthMiddleware, requireSessionAdmin } from "../middleware/sessionAuth.js";
import { encryptSecret, isEncryptionConfigured } from "../utils/encryption.js";
import { testConnector } from "../services/connectors/testConnector.js";
import { invalidateConnectorCache } from "../services/connectors/connectorSecrets.js";

export const connectorsRouter = Router();

connectorsRouter.get("/connectors", sessionAuthMiddleware, async (req, res, next) => {
  try {
    const workspaceId = req.session!.workspace._id;
    const connectors = await Connector.find({ workspaceId }).lean();

    const byType = Object.fromEntries(
      connectorTypes.map((type) => {
        const found = connectors.find((c) => c.type === type);
        return [
          type,
          found
            ? {
                type: found.type,
                enabled: found.enabled,
                config: found.config,
                healthStatus: found.healthStatus,
                configured: Boolean(found.secretEncrypted),
                updatedAt: found.updatedAt,
              }
            : {
                type,
                enabled: false,
                config: {},
                healthStatus: "healthy" as const,
                configured: false,
              },
        ];
      }),
    );

    res.json({ connectors: byType });
  } catch (error) {
    next(error);
  }
});

connectorsRouter.put(
  "/connectors/:type",
  sessionAuthMiddleware,
  requireSessionAdmin,
  async (req, res, next) => {
    try {
      const type = connectorTypeParamSchema.parse(req.params.type);
      const body = connectorUpsertSchema.parse(req.body);
      const workspaceId = req.session!.workspace._id;

      if (body.secret && !isEncryptionConfigured()) {
        res.status(503).json({ error: "Connector encryption is not configured" });
        return;
      }

      const update: Record<string, unknown> = {
        enabled: body.enabled,
        config: body.config,
        healthStatus: "healthy",
      };

      if (body.secret) {
        update.secretEncrypted = encryptSecret(body.secret);
      }

      const connector = await Connector.findOneAndUpdate(
        { workspaceId, type },
        { $set: update, $setOnInsert: { workspaceId, type } },
        { upsert: true, new: true },
      );

      invalidateConnectorCache(workspaceId.toString(), type);

      res.json({
        type: connector!.type,
        enabled: connector!.enabled,
        config: connector!.config,
        healthStatus: connector!.healthStatus,
        configured: Boolean(connector!.secretEncrypted),
      });
    } catch (error) {
      next(error);
    }
  },
);

connectorsRouter.delete(
  "/connectors/:type",
  sessionAuthMiddleware,
  requireSessionAdmin,
  async (req, res, next) => {
    try {
      const type = connectorTypeParamSchema.parse(req.params.type);
      const workspaceId = req.session!.workspace._id;
      await Connector.deleteOne({ workspaceId, type });
      invalidateConnectorCache(workspaceId.toString(), type);
      res.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  },
);

connectorsRouter.post(
  "/connectors/:type/test",
  sessionAuthMiddleware,
  requireSessionAdmin,
  async (req, res, next) => {
    try {
      const type = connectorTypeParamSchema.parse(req.params.type);
      const workspaceId = req.session!.workspace._id;
      const result = await testConnector(workspaceId.toString(), type);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);
