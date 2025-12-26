import { Router } from "express";
import { getUserStats } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me/stats", requireAuth, getUserStats);

export default router;
