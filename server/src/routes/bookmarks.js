import { Router } from "express";
import {
  upsertBookmark,
  getBookmark,
  deleteBookmark,
  listBookmarks
} from "../controllers/bookmarkController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, upsertBookmark);
router.get("/", requireAuth, listBookmarks);
router.get("/:movieId", requireAuth, getBookmark);
router.delete("/:movieId", requireAuth, deleteBookmark);

export default router;
