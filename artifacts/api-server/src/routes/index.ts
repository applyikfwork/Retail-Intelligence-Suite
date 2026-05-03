import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import customersRouter from "./customers";
import salesRouter from "./sales";
import campaignsRouter from "./campaigns";
import loyaltyRouter from "./loyalty";
import postsRouter from "./posts";
import footfallRouter from "./footfall";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(customersRouter);
router.use(salesRouter);
router.use(campaignsRouter);
router.use(loyaltyRouter);
router.use(postsRouter);
router.use(footfallRouter);

export default router;
