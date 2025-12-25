import { Router } from "express";
import { listMovies, getMovie, createMovie, updateMovie, bindGenres } from "../controllers/movieController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", listMovies);
router.get("/:movieId", getMovie);

router.post("/", requireAuth, requireAdmin, createMovie);
router.put("/:movieId", requireAuth, requireAdmin, updateMovie);
router.put("/:movieId/genres", requireAuth, requireAdmin, bindGenres);

export default router;
