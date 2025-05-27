const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    });
    console.log("MongoDB 연결됨");
  } catch (error) {
    console.log("MongoDB 연결 안됨", err);
    process.exit(1); // Node.js 프로세스를 즉시 종료
  }
};

export default connectDB;
