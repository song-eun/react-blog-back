import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url"; // 현재 파일의 절대 경로를 구하기 위한 도구

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const multerUpload = multer({ storage });

export const upload = {
  single: (fieldName) => (req, res, next) => {
    multerUpload.single(fieldName)(req, res, (err) => {
      if (err) return next(err);

      // 파일이 업로드된 경우 경로 정규화
      if (req.file) {
        req.file.path = `uploads/${req.file.filename}`;
      }
      next();
    });
  },
};
