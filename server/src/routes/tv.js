import { Router } from "express";
import { listTvShows, getTvShow } from "../controllers/tvController.js";

const router = Router();

router.get("/", listTvShows);
router.get("/:id", getTvShow);

export default router;
