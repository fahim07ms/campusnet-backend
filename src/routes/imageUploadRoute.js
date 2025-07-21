const express = require("express");
const {authMiddleware} = require("../middlewares/authMiddleware");
const router = express.Router();

const {
    uploadImage,
    generateSignedUploadUrl
} = require("../controllers/imageUploadController");

router.post("/images", authMiddleware, uploadImage);
router.post("/signed-url", authMiddleware, generateSignedUploadUrl);

module.exports = {
    imageUploadRoute: router,
}