import { Comment } from "../models/Comment.js";
import { Post } from "../models/Post.js";

export const createPost = async (req, res) => {
  try {
    const { title, summary, content } = req.body;

    const postData = {
      title,
      summary,
      content,
      cover: req.file ? req.file.path : null,
      author: req.user.username,
    };

    await Post.create(postData);

    return res.status(201).json({ message: "게시글 작성 완료" });
  } catch (error) {
    console.log("게시글 작성 에러", error);
    return res.status(500).json({ error: "게시글 작성 실패" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 3;
    const skip = page * limit;

    const total = await Post.countDocuments();

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const postsWithCommentCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({
          postId: post._id,
        });
        const postObject = post.toObject();
        postObject.commentCount = commentCount;
        return postObject;
      })
    );

    const hasMore = total > skip + posts.length;

    return res.status(200).json({
      posts: postsWithCommentCounts,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("게시물 조회 오류:", err);
    return res.status(500).json({ error: "게시물 조회에 실패했습니다." });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    const commentCount = await Comment.countDocuments({ postId });
    const postWithCommentCount = post.toObject();
    postWithCommentCount.commentCount = commentCount;

    return res.status(200).json(postWithCommentCount);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "게시글 조회 실패" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }

    if (post.author !== req.user.username) {
      return res.status(403).json({ error: "자신의 글만 삭제할 수 있습니다." });
    }

    await Post.findByIdAndDelete(postId);
    return res.status(200).json({ message: "게시물이 삭제되었습니다." });
  } catch (err) {
    console.error("게시물 삭제 오류:", err);
    return res.status(500).json({ error: "게시물 삭제에 실패했습니다." });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, summary, content } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }

    if (post.author !== req.user.username) {
      return res.status(403).json({ error: "자신의 글만 수정할 수 있습니다." });
    }

    const updateData = {
      title,
      summary,
      content,
      cover: req.file ? req.file.path : null,
    };

    const updatedPost = await Post.findByIdAndUpdate(postId, updateData, {
      new: true,
    });

    return res
      .status(200)
      .json({ message: "게시물이 수정되었습니다.", post: updatedPost });
  } catch (error) {
    console.error("게시물 수정 오류:", error);
    return res.status(500).json({ error: "게시물 수정에 실패했습니다." });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    const isLiked = post.likes.some(
      (id) => id.toString() === userId.toString()
    );
    let updatedPost;

    if (isLiked) {
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $pull: { likes: userId },
        },
        { new: true }
      );
    } else {
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          $push: { likes: userId },
        },
        { new: true }
      );
    }

    return res
      .status(200)
      .json({ likesCount: updatedPost.likes.length, liked: !isLiked });
  } catch (error) {
    console.error("좋아요 처리 중 에러:", error);
    return res.status(500).json({ error: "서버 에러" });
  }
};
