import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { IUser, User } from "../models/user.model";
import { ApiResponse } from "../utils/ApiResponse";
import * as jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (
  userId: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    throw new ApiError(500, "All Fields are Required");
  }

  const existingUser = await User.findOne({
    email,
  });

  if (existingUser) {
    throw new ApiError(409, "User Already Exists");
  }

  const user = await User.create({
    email,
    password,
    fullName,
  });

  // removing password and token before sending response
  const createdUser = await User.findById(user._id).select(
    "-refeshToken -password"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong with user Creation");
  }

  res.status(201).json(new ApiResponse(201, createdUser, "User created"));
};

const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(500, "Missing field");
  }

  const user = await User.findOne({ email });

  if (!user || !user._id) {
    throw new ApiError(404, "User Doesn't exists");
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    throw new ApiError(404, "Incorrect Password");
  }

  const tokens = await generateAccessAndRefreshTokens(String(user._id));

  if (!tokens) {
    throw new ApiError(500, "Error in Token Creation");
  }

  const { accessToken, refreshToken } = tokens;

  const loggedInUser = await User.findById(user._id).select(
    "-refeshToken -password"
  );

  const options = { httpOnly: true, secure: true };

  res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(201, loggedInUser, "Loggin Success"));
};

const logoutUser = async (req: Request, res: Response) => {
  const user = (req as Request & { user: IUser }).user;
  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = { httpOnly: true, secure: true };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "Logged Out Successfully"));
};

export { registerUser, loginUser, logoutUser };
