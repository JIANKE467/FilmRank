import { Router } from "express";
import { createReview, updateReview, deleteReview, adminHideReview } from "../controllers/reviewController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createReview);
router.put("/:reviewId", requireAuth, updateReview);
router.delete("/:reviewId", requireAuth, deleteReview);
router.put("/:reviewId/status", requireAuth, requireAdmin, adminHideReview);

export default router;
