export const createPost = async (req, res) => {
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
};
