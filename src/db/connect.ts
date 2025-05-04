import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.DB_CONNECTION_STRING}/vault`);
    console.log("Connection Success");
  } catch (error) {
    console.log("Connection Error", error);
    process.exit(1);
  }
};

export { connectDB };
