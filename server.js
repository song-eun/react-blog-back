import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url"; // 현재 파일의 절대 경로를 구하기 위한 도구

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";

const app = express();

dotenv.config();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/uploads/:filename", (req, res) => {
  const { filename } = req.params;
  console.log(filename);
  res.sendFile(path.join(__dirname, "uploads", filename));
});

connectDB();

app.use("/auth", authRoutes);
app.use("/post", postRoutes);
app.use("/comment", commentRoutes);

// 404 에러 처리 = 정의되지 않은 경로
app.use((req, res) => {
  res.status(404).json({ error: "요청한 페이지를 찾을 수 없습니다." });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

// 프로세스 종료 시 처리
process.on("SIGINT", () => {
  console.log("서버를 종료합니다.");
  process.exit(0);
});

// 예기치 않은 에러 처리
process.on("uncaughtException", (err) => {
  console.error("예기치 않은 에러:", err);
  process.exit(1);
});

export default app;
