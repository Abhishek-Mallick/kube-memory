import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { connectMongo, isMongoConfigured } from "../db/connection.js";
import { Connector } from "../db/models/Connector.js";
import { MemoryEventRecord } from "../db/models/MemoryEventRecord.js";
import { isCogneeConfigured } from "../services/cognee/client.js";
import { isKubernetesConfigured } from "../services/kubernetes/client.js";

export const statusRouter = Router();

statusRouter.get("/status", authMiddleware, async (req, res, next) => {
  try {
    const workspace = req.kubeAuth!.workspace;
    let connectorCount = 0;
    let memoryEventCount = 0;

    if (isMongoConfigured()) {
      await connectMongo();
      connectorCount = await Connector.countDocuments({ workspaceId: workspace._id });
      memoryEventCount = await MemoryEventRecord.countDocuments({ workspaceId: workspace._id });
    }

    res.json({
      workspace: {
        slug: workspace.slug,
        name: workspace.name,
        cogneeDataset: workspace.cogneeDataset,
        retentionDays: workspace.retentionDays,
      },
      integrations: {
        cognee: isCogneeConfigured(),
        kubernetes: isKubernetesConfigured(),
        mongo: isMongoConfigured(),
      },
      stats: {
        connectors: connectorCount,
        memoryEvents: memoryEventCount,
      },
    });
  } catch (error) {
    next(error);
  }
});
