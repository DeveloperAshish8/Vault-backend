import mongoose, { Schema } from "mongoose";

const assetSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    tags: {
      type: [String],
    },
    url: {
      type: String,
    },
    publicId: {
      type: String,
    },
    version: {
      type: Number,
      default: 1,
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    allowedUsers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
    },
    downloads: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const assetModel = mongoose.model("Assets", assetSchema);
