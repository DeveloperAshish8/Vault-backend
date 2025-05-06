import * as jwt from "jsonwebtoken";

export const generateDownloadToken = (assetId: string, expiresIn = 3600) => {
  const payload = {
    assetId,
  };
  const secret: jwt.Secret | undefined = process.env.DOWNLOAD_SECRET;
  if (!secret) {
    throw new Error("Missing ACCESS_TOKEN_SECRET  in environment variables");
  }

  const options: jwt.SignOptions = {
    expiresIn: expiresIn,
  };

  return jwt.sign(payload, secret, options);
};
