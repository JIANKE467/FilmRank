import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { listUsers, setUserStatus, setRatingPolicy } from "../controllers/adminController.js";
import { generateBatch } from "../controllers/recommendationController.js";

const router = Router();

router.get("/users", requireAuth, requireAdmin, listUsers);
router.put("/users/:userId/status", requireAuth, requireAdmin, setUserStatus);
router.post("/rating-policy", requireAuth, requireAdmin, setRatingPolicy);
router.post("/recommendations/generate", requireAuth, requireAdmin, generateBatch);

export default router;
