import multer from "multer";
import path from "path";
import fs from "fs";

const TEMP_DIR = path.join(__dirname, "..", "public", "temp");

// Ensure the temp folder exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });
