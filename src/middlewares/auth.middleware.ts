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

    let decodedToken: JwtPayload;
    try {
      decodedToken = jwt.verify(
        token,
        String(process.env.ACCESS_TOKEN_SECRET)
      ) as JwtPayload;
    } catch (err) {
      // accessToken might be expired or invalid
      const refreshToken =
        req.cookies?.refreshToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!refreshToken) {
        return next(new ApiError(401, "Refresh token missing or invalid"));
      }

      console.log("Inside Refresh Token logic");

      let payload: jwt.JwtPayload;
      try {
        payload = jwt.verify(
          refreshToken,
          String(process.env.REFRESH_TOKEN_SECRET)
        ) as jwt.JwtPayload;
      } catch (refreshErr) {
        return next(new ApiError(401, "Invalid Refresh Token"));
      }

      const userByToken = await User.findOne({ refreshToken });

      if (
        !userByToken?._id ||
        payload._id.toString() !== userByToken._id.toString()
      ) {
        return next(new ApiError(401, "Invalid Refresh Token"));
      }

      const expiry: number | undefined = process.env.ACCESS_TOKEN_EXPIRY
        ? parseInt(process.env.ACCESS_TOKEN_EXPIRY, 10)
        : undefined;

      const newAccessToken = jwt.sign(
        { _id: payload._id },
        String(process.env.ACCESS_TOKEN_SECRET),
        { expiresIn: expiry }
      );
      const options = { httpOnly: true, secure: true };

      // Set the new access token in the cookie
      res.cookie("accessToken", newAccessToken, options);

      const user = await User.findById(payload._id);
      if (!user) {
        return next(new ApiError(401, "User not found"));
      }

      (req as any).user = user;
      return next();
    }

    // Valid access token
    const user = await User.findById(decodedToken._id);
    console.log("Normal Flow");

    if (!user) {
      return next(new ApiError(401, "User not found"));
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return next(new ApiError(401, "Error in Verifying JWT"));
  }
};
