import { Router } from "express";
import { getRecommendations, listBatches } from "../controllers/recommendationController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, getRecommendations);
router.get("/batches", requireAuth, requireAdmin, listBatches);

export default router;
