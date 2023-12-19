import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const dbConnection = await mongoose.connect(`${process.env.DB_URL}/${DB_NAME}`);
    console.log(`\n DB Connected! DB HOST: ${dbConnection.connection.host}`);
  } catch (error) {
    console.log(error);
    console.log(`DB not available to connect: ${error}`)
    process.exit(1)
  }
}

export default connectDB;