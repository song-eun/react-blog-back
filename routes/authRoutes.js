import express from "express";
import {
  getProfile,
  login,
  logout,
  register,
} from "../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", getProfile);
router.post("/logout", logout);

export default router;
