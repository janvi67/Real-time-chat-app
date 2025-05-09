import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { deleteMessage, deleteAllMessages,getMessages, getUserForSidebar,sendMessage } from "../controllers/message.controller.js";

const router=express.Router();

router.get("/users",protectRoute,getUserForSidebar)
router.get("/:id",protectRoute,getMessages)

router.post("/send/:id", protectRoute, sendMessage);
router.delete("/delete/:id",protectRoute,deleteMessage);
router.delete("/deleteAll/:id",protectRoute,deleteAllMessages);

export default router