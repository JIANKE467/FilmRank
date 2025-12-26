import { Router } from "express";
import { upsertBookmark, getBookmark, deleteBookmark } from "../controllers/bookmarkController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, upsertBookmark);
router.get("/:movieId", requireAuth, getBookmark);
router.delete("/:movieId", requireAuth, deleteBookmark);

export default router;
