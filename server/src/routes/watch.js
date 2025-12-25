import { Router } from "express";
import { startWatch, updateWatch, listWatchHistory } from "../controllers/watchController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, startWatch);
router.put("/:watchId", requireAuth, updateWatch);
router.get("/history", requireAuth, listWatchHistory);

export default router;
