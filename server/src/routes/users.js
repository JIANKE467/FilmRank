import { Router } from "express";
import { getUserStats, getMe, updateMe } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me/stats", requireAuth, getUserStats);
router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);

export default router;
