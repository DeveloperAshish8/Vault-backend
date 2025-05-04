import { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  deleteAsset,
  getAllAssets,
  getAssetsById,
  getDownloadLink,
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

export default route;
