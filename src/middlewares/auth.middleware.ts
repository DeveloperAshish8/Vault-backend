import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

interface JwtPayload {
  _id: string;
}

export const verifyJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json(new ApiResponse(401, "Login to continue"));
      return;
    }

    const decodedToken = jwt.verify(
      token,
      String(process.env.ACCESS_TOKEN_SECRET)
    ) as JwtPayload;

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      res.status(401).json(new ApiResponse(401, "Invalid Token"));
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return next(new ApiError(401, "Error in Verifying JWT"));
  }
};
