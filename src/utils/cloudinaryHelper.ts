import { v2 as cloudinary } from "cloudinary";
import { promises as fsPromises } from "fs";
import { existsSync } from "fs";
import path from "path";
import { ApiError } from "./ApiError";

const uploadOnCloudinary = async (localFilePath: string) => {
  try {
    if (!localFilePath || !existsSync(localFilePath)) {
      console.warn("File does not exist:", localFilePath);
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    await fsPromises.unlink(localFilePath);
    return response;
  } catch (error) {
    console.error("Upload error:", error);
    await fsPromises.unlink(localFilePath);
    return null;
  }
};

const generateSignedUrl = (
  publicId: string,
  expiresInSeconds = 300
): string => {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return cloudinary.utils.private_download_url(publicId, "raw", {
    type: "authenticated",
    expires_at: expiresAt,
  });
};

const deleteAssetFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }
    console.log("Delete Success");

    return result;
  } catch (err) {
    console.error("Cloudinary Delete Error:", err);
    throw new ApiError(500, "Failed to delete asset from Cloudinary");
  }
};

export { uploadOnCloudinary, deleteAssetFromCloudinary, generateSignedUrl };
