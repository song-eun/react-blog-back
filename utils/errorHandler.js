export const errorHandler = (err, req, res, next) => {
  console.error("서버 에러", err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || "서버 에러가 발생했습니다.";
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
