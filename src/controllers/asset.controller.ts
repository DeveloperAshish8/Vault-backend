import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import * as jwt from "jsonwebtoken";
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
import { generateDownloadToken } from "../utils/downloadToken";

const uploadFile = async (req: Request, res: Response) => {
  const userId = (req as Request & { user: IUser }).user._id;
  const fileName = req.body.fileName;
  const fileLocalPath = (
    req.files as { [fieldname: string]: Express.Multer.File[] }
  )?.asset[0]?.path;
  // console.log("Filepath", fileLocalPath, userId);
  if (!fileLocalPath) {
    throw new ApiError(400, "missing file");
  }

  const asset = await uploadOnCloudinary(fileLocalPath);

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
    title: fileName || originalFileName,
    owner: userId,
    url: asset.url,
    publicId: asset.public_id,
    version: newVersion,
    tags: req.body.tags || [],
  });

  res
    .status(201)
    .json(new ApiResponse(201, newAsset, "Asset Added Successfully"));
};

const getAllAssets = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: IUser }).user._id;
    const Assets = await assetModel.find({ owner: userId });
    const sharedAsset = await assetModel.find({
      allowedUsers: userId,
      owner: { $ne: userId },
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { UserAsset: Assets, sharedAsset: sharedAsset },
          "Assets fetched Successfully"
        )
      );
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID");
  }

  const updateFields: any = {};
  const { tags, isPrivate } = req.body;

  if (tags) updateFields.tags = tags;
  if (typeof isPrivate === "boolean") updateFields.isPrivate = isPrivate;

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  const updatedAsset = await assetModel.findByIdAndUpdate(id, updateFields, {
    new: true,
  });

  res.status(201).json(new ApiResponse(201, updatedAsset, "Update Success"));
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

  let downloadUrl = asset.url;
  let expiresAt: string | null = null;

  if (asset.isPrivate) {
    const token = generateDownloadToken(asset._id.toString(), 3600 * 1000);
    downloadUrl = `${process.env.BASE_URL}/api/v1/assets/download/file/${token}`;
    const expiry = new Date(Date.now() + 3600 * 1000);
    expiresAt = expiry.toISOString();
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        downloadUrl: asset.isPrivate ? downloadUrl : asset.url,
        expiresAt: asset.isPrivate ? expiresAt : null,
      },
      "Download link generated"
    )
  );
};

const serveFileWithToken = async (req: Request, res: Response) => {
  const { token } = req.params;
  console.log(token);

  try {
    const decoded = jwt.verify(
      token,
      process.env.DOWNLOAD_SECRET || "default_secret"
    ) as {
      assetId: string;
    };

    console.log(decoded.assetId);

    const asset = await assetModel.findById(decoded.assetId);
    console.log(asset);

    if (!asset) {
      throw new ApiError(404, "Asset not found");
    }
    const updatedDownloadCount = asset?.downloads + 1;
    const updatedAsset = await assetModel.findByIdAndUpdate(
      decoded.assetId,
      {
        downloads: updatedDownloadCount + 1,
      },
      { new: true }
    );

    if (!updatedAsset) {
      throw new ApiError(400, "Something went wrong");
    }
    console.log(updatedAsset);

    res.redirect(String(updatedAsset.url)); // redirect to actual cloudinary URL
  } catch (error) {
    throw new ApiError(404, "Invalid or expired download link");
  }
};

const addAllowedUsers = async (req: Request, res: Response) => {
  const assetId = req.params.id;
  const userToAdd = req.body.userId;
  const userId = (req as Request & { user: IUser }).user._id;

  if (
    !mongoose.Types.ObjectId.isValid(assetId) &&
    !mongoose.Types.ObjectId.isValid(userToAdd)
  ) {
    throw new ApiError(400, "Invalid Asset or user ID");
  }

  const asset = await assetModel.findById(assetId);
  if (!asset) {
    throw new ApiError(404, "Asset not found");
  }

  if (!asset.owner || !userId) {
    throw new ApiError(400, "Asset owner or user not found");
  }

  if (asset.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Not Allowed to modify asset settings");
  }

  if (asset.allowedUsers.includes(userToAdd)) {
    throw new ApiError(400, "User Already allowed for this Asset");
  }

  asset.allowedUsers.push(userToAdd);
  await asset.save();

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { "Allowed User": asset.allowedUsers },
        "Update Success"
      )
    );
};
const removeAllowedUsers = async (req: Request, res: Response) => {
  const assetId = req.params.id;
  const userToRemove = req.body.userId;
  const userId = (req as Request & { user: IUser }).user._id;

  if (
    !mongoose.Types.ObjectId.isValid(assetId) &&
    !mongoose.Types.ObjectId.isValid(userToRemove)
  ) {
    throw new ApiError(400, "Invalid Asset or user ID");
  }

  const asset = await assetModel.findById(assetId);
  if (!asset) {
    throw new ApiError(404, "Asset not found");
  }

  if (!asset.owner || !userId) {
    throw new ApiError(400, "Asset owner or user not found");
  }

  if (asset.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Not Allowed to modify asset settings");
  }

  if (!asset.allowedUsers.includes(userToRemove)) {
    throw new ApiError(400, "User Already not allowed for this Asset");
  }

  await assetModel.updateOne(
    { _id: assetId },
    { $pull: { allowedUsers: userToRemove } }
  );
  res.status(201).json(new ApiResponse(201, {}, "Update Success"));
};

export {
  uploadFile,
  getAllAssets,
  getAssetsById,
  updateAsset,
  deleteAsset,
  getDownloadLink,
  serveFileWithToken,
  addAllowedUsers,
  removeAllowedUsers,
};
