import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import {
  createComment,
  deleteComment,
  getCommentByPostId,
  updateComment,
} from "../controllers/commentController.js";

const router = express.Router();

router.post("/", authenticateToken, createComment);
router.get("/:postId", getCommentByPostId);
router.delete("/:commentId", authenticateToken, deleteComment);
router.put("/:commentId", authenticateToken, updateComment);

export default router;
