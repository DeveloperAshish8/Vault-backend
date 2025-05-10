import { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  addAllowedUsers,
  deleteAsset,
  getAllAssets,
  getAssetsById,
  getDownloadLink,
  serveFileWithToken,
  updateAsset,
  uploadFile,
} from "../controllers/asset.controller";

const route = Router();

route.post(
  "/upload",
  verifyJWT,
  upload.fields([
    {
      name: "asset",
      maxCount: 1,
    },
  ]),
  uploadFile
);

route.get("/my-assets", verifyJWT, getAllAssets);
route.get("/:id", verifyJWT, getAssetsById);
route.put("/:id", verifyJWT, updateAsset);
route.delete("/:id", verifyJWT, deleteAsset);
route.get("/download/:id", verifyJWT, getDownloadLink);
route.get("/download/file/:token", serveFileWithToken);
route.post("/:id/allow-user", verifyJWT, addAllowedUsers);

export default route;
