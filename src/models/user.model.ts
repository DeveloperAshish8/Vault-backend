import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  refreshToken: string;
  comparePassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//compare password
userSchema.methods.comparePassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  const secret: jwt.Secret | undefined = process.env.ACCESS_TOKEN_SECRET;
  const expiry: number | undefined = process.env.ACCESS_TOKEN_EXPIRY
    ? parseInt(process.env.ACCESS_TOKEN_EXPIRY, 10)
    : undefined;

  if (!secret || !expiry) {
    throw new Error(
      "Missing ACCESS_TOKEN_SECRET or ACCESS_TOKEN_EXPIRY in environment variables"
    );
  }

  const payload = {
    _id: this._id,
    email: this.email,
    fullName: this.fullName,
  };

  const options: jwt.SignOptions = {
    expiresIn: expiry,
  };

  return jwt.sign(payload, secret, options);
};

userSchema.methods.generateRefreshToken = function (): string {
  const secret: jwt.Secret | undefined = process.env.REFRESH_TOKEN_SECRET;
  const expiry: number | undefined = process.env.REFRESH_TOKEN_EXPIRY
    ? parseInt(process.env.REFRESH_TOKEN_EXPIRY, 10)
    : undefined;

  if (!secret || !expiry) {
    throw new Error(
      "Missing REFRESH_TOKEN_SECRET or REFRESH_TOKEN_EXPIRY in environment variables"
    );
  }

  const payload = {
    _id: this._id,
  };

  const options: jwt.SignOptions = {
    expiresIn: expiry,
  };

  return jwt.sign(payload, secret, options);
};

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
