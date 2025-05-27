import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { userModel } from "./models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { postModel } from "./models/Post.js";

import { fileURLToPath } from "url";
import { commentModel } from "./models/Comment.js";
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

mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME,
  })
  .then(() => console.log("MongoDB 연결됨"))
  .catch((error) => {
    console.log(error);
  });

const saltRounds = Number(process.env.SALT_ROUND);
const secretKey = process.env.JWT_SCR_KEY;
const tokenLife = process.env.JWT_EXP;

const cookiesOption = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  path: "/",
};

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "이미 존재하는 아이디입니다." });
    }

    const userDoc = new userModel({
      username,
      password: bcrypt.hashSync(password, saltRounds),
    });

    const savedUser = await userDoc.save();
    res.status(201).json({
      user: {
        username: savedUser.username,
        _id: savedUser._id,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "서버 오류" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userDoc = await userModel.findOne({ username });
    if (!userDoc) {
      return res.status(401).json({ error: "없는 사용자입니다." });
    }

    const isOk = bcrypt.compareSync(password, userDoc.password);
    if (!isOk) {
      return res.status(401).json({ error: "비밀번호가 틀렸습니다." });
    } else {
      const payload = { id: userDoc._id, username: userDoc.username };
      const token = jwt.sign(payload, secretKey, {
        expiresIn: tokenLife,
      });
      res.cookie("token", token, cookiesOption).json({
        id: userDoc._id,
        username,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "서버 에러" });
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.json({ error: "로그인 필요" });
  }

  jwt.verify(token, secretKey, (err, info) => {
    if (err) {
      return res.json({ error: "로그인 필요" });
    }
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  const logoutToken = {
    ...cookiesOption,
    maxAge: 0,
  };

  res.cookie("token", "", logoutToken).json({ message: "로그아웃 되었음" });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/uploads/:filename", (req, res) => {
  const { filename } = req.params;
  console.log(filename);
  res.sendFile(path.join(__dirname, "uploads", filename));
});

const uploadDir = "uploads";

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

const upload = multer({ storage });

app.post("/postWrite", upload.single("files"), async (req, res) => {
  try {
    const { title, summary, content } = req.body;
    const { token } = req.cookies;
    if (!token) return res.status(401).json({ error: "로그인 필요" });

    const userInfo = jwt.verify(token, secretKey);

    console.log("----", req.body);

    const postData = {
      title,
      summary,
      content,
      cover: req.file ? req.file.path : null,
      author: userInfo.username,
    };

    await postModel.create(postData);
    console.log("게시글 작성 완료");

    return res.status(201).json({ message: "게시글 작성 완료" });
  } catch (error) {
    console.log("게시글 작성 에러", error);
    return res.status(500).json({ error: "게시글 작성 실패" });
  }
});

app.get("/postlist", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 3;
    const skip = page * limit;

    const total = await postModel.countDocuments();

    const posts = await postModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const postsWithCommentCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await commentModel.countDocuments({
          postId: post._id,
        });
        const postObject = post.toObject();
        postObject.commentCount = commentCount;
        return postObject;
      })
    );

    const hasMore = total > skip + posts.length;

    res.json({
      posts: postsWithCommentCounts,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("게시물 조회 오류:", err);
    res.status(500).json({ error: "게시물 조회에 실패했습니다." });
  }
});

app.get("/post/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    const commentCount = await commentModel.countDocuments({ postId });
    const postWithCommentCount = post.toObject();
    postWithCommentCount.commentCount = commentCount;

    res.json(postWithCommentCount);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "게시글 조회 실패" });
  }
});

app.delete("/post/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await postModel.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }
    res.json({ message: "게시물이 삭제되었습니다." });
  } catch (err) {
    console.error("게시물 삭제 오류:", err);
    res.status(500).json({ error: "게시물 삭제에 실패했습니다." });
  }
});

app.put("/post/:postId", upload.single("files"), async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, summary, content } = req.body;
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({ error: "로그인 필요" });
    }

    const userInfo = jwt.verify(token, secretKey);

    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }

    if (post.author !== userInfo.username) {
      return res.status(403).json({ error: "자신의 글만 수정할 수 있습니다." });
    }

    const updateData = {
      title,
      summary,
      content,
      cover: req.file ? req.file.path : null,
    };

    const updatedPost = await postModel.findByIdAndUpdate(postId, updateData, {
      new: true,
    });

    res.json({ message: "게시물이 수정되었습니다.", post: updatedPost });
  } catch (error) {
    console.error("게시물 수정 오류:", error);
    res.status(500).json({ error: "게시물 수정에 실패했습니다." });
  }
});

app.post("/like/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { token } = req.cookies;
    if (!token) return res.status(401).json({ message: "로그인 필요" });

    const userInfo = jwt.verify(token, secretKey);
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    const isLiked = post.likes.includes(userInfo.id);
    let updatedPost;

    if (isLiked) {
      updatedPost = await postModel.findByIdAndUpdate(
        postId,
        {
          $pull: { likes: userInfo.id },
        },
        { new: true }
      );
    } else {
      updatedPost = await postModel.findByIdAndUpdate(
        postId,
        {
          $push: { likes: userInfo.id },
        },
        { new: true }
      );
    }

    // res.json({ post: updatedPost });
    res.json({ likesCount: updatedPost.likes.length, liked: !isLiked });
  } catch (error) {
    console.error("좋아요 처리 중 에러:", error);
    return res.status(500).json({ error: "서버 에러" });
  }
});

app.post("/comment", async (req, res) => {
  try {
    const { postId, content } = req.body;
    const { token } = req.cookies;
    if (!token) return res.status(401).json({ error: "로그인 필요" });

    const userInfo = jwt.verify(token, secretKey);

    const newComment = await commentModel.create({
      postId,
      content,
      author: userInfo.username,
    });

    return res
      .status(201)
      .json({ message: "댓글 작성 완료", data: newComment });
  } catch (error) {
    console.log("댓글 작성 에러", error);
    return res.status(500).json({ error: "댓글 작성 실패" });
  }
});

app.get("/comment/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ error: "postId가 필요합니다." });
    }

    const comments = await commentModel
      .find({ postId })
      .sort({ createdAt: -1 });

    return res.status(200).json(comments);
  } catch (error) {
    console.log("댓글 조호 오류", error);
    res.status(500).json({ error: "댓글 조회에 실패했습니다." });
  }
});

app.delete("/comment/:commentId", async (req, res) => {
  const { token } = req.cookies;
  const { commentId } = req.params;

  if (!token) return res.status(401).json({ error: "로그인 필요" });

  try {
    const userInfo = jwt.verify(token, secretKey);

    const comment = await commentModel.findByIdAndDelete(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    const post = await postModel.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    if (
      comment.author !== userInfo.username &&
      userInfo.username !== post.author
    )
      return res.status(403).json({ message: "삭제 권한이 없습니다." });

    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
});

app.put("/comment/:commentId", async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  let userInfo;
  try {
    userInfo = jwt.verify(token, secretKey);
  } catch (err) {
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }

  try {
    const comment = await commentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    const post = await postModel.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    const isCommentAuthor = comment.author === userInfo.username;

    if (!isCommentAuthor) {
      return res.status(403).json({ message: "수정 권한이 없습니다." });
    }

    const updatedComment = await commentModel.findByIdAndUpdate(
      commentId,
      { content },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "댓글이 수정되었습니다.", data: updatedComment });
  } catch (error) {
    console.error("댓글 수정 오류:", error);
    res.status(500).json({ message: "댓글 수정 중 서버 오류가 발생했습니다." });
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
