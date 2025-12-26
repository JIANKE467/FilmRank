import { Router } from "express";
import { listTvShows } from "../controllers/tvController.js";

const router = Router();

router.get("/", listTvShows);

export default router;
