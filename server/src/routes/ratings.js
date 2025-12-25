import { Router } from "express";
import { rateMovie, deleteRating } from "../controllers/ratingController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, rateMovie);
router.delete("/:ratingId", requireAuth, deleteRating);

export default router;
