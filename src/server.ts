import { app } from "./app";
import dotenv from "dotenv";
import { connectDB } from "./db/connect";

dotenv.config();
connectDB()
  .then(() =>
    app.listen(8000, () => {
      console.log("Server Up");
    })
  )
  .catch((error) => console.log(error));
