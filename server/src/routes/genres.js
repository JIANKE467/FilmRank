import { Router } from "express";
import { listGenres, createGenre, updateGenre } from "../controllers/genreController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", listGenres);
router.post("/", requireAuth, requireAdmin, createGenre);
router.put("/:genreId", requireAuth, requireAdmin, updateGenre);

export default router;
