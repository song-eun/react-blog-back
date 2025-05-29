import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import {
  createPost,
  deletePost,
  getPostById,
  getPosts,
  toggleLike,
  updatePost,
} from "../controllers/postController.js";

const router = express.Router();

router.post("/", authenticateToken, upload.single("files"), createPost);
router.get("/", getPosts);
router.get("/:postId", getPostById);
router.delete("/:postId", authenticateToken, deletePost);
router.put("/:postId", authenticateToken, upload.single("files"), updatePost);
router.post("/:postId/like", authenticateToken, toggleLike);

export default router;
