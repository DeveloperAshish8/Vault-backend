import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import {
  deleteAssetFromCloudinary,
  generateSignedUrl,
  uploadOnCloudinary,
} from "../utils/cloudinaryHelper";
import { assetModel } from "../models/asset.model";
import { IUser } from "../models/user.model";
import { ApiResponse } from "../utils/ApiResponse";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

const uploadFile = async (req: Request, res: Response) => {
  const userId = (req as Request & { user: IUser }).user._id;
  const fileLocalPath = (
    req.files as { [fieldname: string]: Express.Multer.File[] }
  )?.asset[0]?.path;
  // console.log("Filepath", fileLocalPath, userId);
  if (!fileLocalPath) {
    throw new ApiError(400, "missing file");
  }

  const asset = await uploadOnCloudinary(fileLocalPath);
  // console.log(asset);

  if (!asset) {
    throw new ApiError(400, "Error in uploading file");
  }

  const originalFileName = (
    req.files as { [fieldname: string]: Express.Multer.File[] }
  )?.asset?.[0]?.originalname;

  const existingAsset = await assetModel
    .findOne({ owner: userId, title: originalFileName })
    .sort({ version: -1 });

  const newVersion = existingAsset ? existingAsset.version + 1 : 1;

  const newAsset = await assetModel.create({
    title: originalFileName,
    owner: userId,
    url: asset.url,
    publicId: asset.public_id,
    version: newVersion,
    tags: req.body.tags || [],
    isPrivate: req.body.isPrivate || false,
  });

  res
    .status(201)
    .json(new ApiResponse(201, newAsset, "Asset Added Successfully"));
};

const getAllAssets = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: IUser }).user._id;
    const Assets = await assetModel.find({ owner: userId });

    res
      .status(201)
      .json(new ApiResponse(201, Assets, "Assets fetched Successfully"));
  } catch (error) {
    throw new ApiError(404, "Something went wrong in data fetching");
  }
};

const getAssetsById = async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = (req as Request & { user: IUser }).user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }

  const Asset = await assetModel.find({ owner: userId, _id: id });

  res
    .status(201)
    .json(new ApiResponse(201, Asset, "Asset fetched successfully"));
};

const updateAsset = async (req: Request, res: Response) => {
  const id = req.params.id;
  const { tags, user, isPrivate } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }

  if (!tags || !user || typeof isPrivate != "boolean") {
    throw new ApiError(500, "Missing Fields");
  }

  const Asset = await assetModel.findOneAndUpdate(
    { _id: id },
    {
      tags: tags,
      allowedUsers: user,
      isPrivate: isPrivate,
    },
    { new: true }
  );

  res.status(201).json(new ApiResponse(201, Asset, "Update Success"));
};

const deleteAsset = async (req: Request, res: Response) => {
  const id = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }

  const Asset = await assetModel.findById(id);
  if (!Asset) {
    throw new ApiError(404, "Asset doesnt exist");
  }
  await deleteAssetFromCloudinary(String(Asset?.publicId));

  const deleteAsset = await assetModel.deleteOne({ _id: id });

  if (deleteAsset.deletedCount === 0) {
    throw new ApiError(404, "Asset not found or already deleted");
  }

  res.status(200).json(new ApiResponse(200, null, "Delete Success"));
};

const getDownloadLink = async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = (req as Request & { user: IUser }).user._id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }

  const asset = await assetModel.findOne({ _id: id });

  if (!asset) {
    throw new ApiError(404, "No Asset Found with this ID");
  }

  if (asset.isPrivate) {
    if (asset.owner?.toString() != userId?.toString()) {
      throw new ApiError(403, "Access Declined");
    }
  }

  const expiry = Math.floor(Date.now() / 1000) * 3600; // 1 hour

  const signedUrl = generateSignedUrl(String(asset.publicId));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        downloadUrl: asset.isPrivate ? signedUrl : asset.url,
        expiresAt: asset.isPrivate
          ? new Date(expiry * 1000).toISOString()
          : null,
      },
      "Download link generated"
    )
  );
};

export {
  uploadFile,
  getAllAssets,
  getAssetsById,
  updateAsset,
  deleteAsset,
  getDownloadLink,
};
