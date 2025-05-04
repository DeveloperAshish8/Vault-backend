import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const route = Router();

route.post("/register", registerUser);
route.post("/login", loginUser);
route.post("/logout", verifyJWT, logoutUser);

export default route;
