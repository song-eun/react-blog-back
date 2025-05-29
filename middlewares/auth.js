import { secretKey } from "../config/jwt.js";
import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "로그인 필요" });
  }

  try {
    const userInfo = jwt.verify(token, secretKey);
    req.user = userInfo;
    next();
  } catch (error) {
    return res.status(403).json({ error: "유효하지 않은 토큰" });
  }
};
