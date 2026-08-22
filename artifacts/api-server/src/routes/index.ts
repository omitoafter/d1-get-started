import { Router, type IRouter } from "express";
import healthRouter from "./health";
import socialRouter from "./social";
import chatRouter from "./chat";
import adminRouter from "./admin";
import blogRouter from "./blog";

const router: IRouter = Router();

router.use(healthRouter);
router.use(socialRouter);
router.use(chatRouter);
router.use(adminRouter);
router.use(blogRouter);

export default router;
