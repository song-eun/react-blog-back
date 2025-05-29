import { Comment } from "../models/Comment.js";
import { Post } from "../models/Post.js";

export const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

    const newComment = await Comment.create({
      postId,
      content,
      author: req.user.username,
    });

    return res.status(201).json(newComment);
  } catch (error) {
    console.log("댓글 작성 에러", error);
    return res.status(500).json({ error: "댓글 작성 실패" });
  }
};

export const getCommentByPostId = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ error: "postId가 필요합니다." });
    }

    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });

    return res.status(200).json(comments);
  } catch (error) {
    console.log("댓글 조회 오류", error);
    res.status(500).json({ error: "댓글 조회에 실패했습니다." });
  }
};

export const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment)
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });

    const post = await Post.findById(comment.postId);
    if (!post)
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });

    if (
      comment.author !== req.user.username &&
      req.user.username !== post.author
    ) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "서버 에러" });
  }
};

export const updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    const post = await Post.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    const isCommentAuthor = comment.author === req.user.username;

    if (!isCommentAuthor) {
      return res.status(403).json({ message: "수정 권한이 없습니다." });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
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
};
