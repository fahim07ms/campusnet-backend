const express = require("express");
const universityController = require("../controllers/universityController.js");

const { authMiddleware } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.get("/", universityController.getUniversities);

module.exports = {
    universityRoutes: router,
};


router.post("/", authMiddleware, universityController.createUniversity);
router.put("/:universityId", authMiddleware, universityController.updateUniversity);
router.delete("/:universityId", authMiddleware, universityController.deleteUniversity);


