const express = require("express");

const userController = require("../controllers/userController.js");

const { authMiddleware } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.get("/", authMiddleware, userController.getUsers);

router.get("/me/profile", authMiddleware, userController.getMyProfile);


module.exports = {
    userRoutes: router,
};




router.get("/me", authMiddleware, userController.getMe);
router.patch("/me/password", authMiddleware, userController.updateMyPassword);
router.get("/:userId", authMiddleware, userController.getUserById);




router.put("/me/profile", authMiddleware, userController.updateMyProfile);
router.get("/me/profile/education", authMiddleware, userController.getMyEducation);
router.post("/me/profile/education", authMiddleware, userController.addMyEducation);
router.put("/me/profile/education/:educationId", authMiddleware, userController.updateMyEducation);
router.delete("/me/profile/education/:educationId", authMiddleware, userController.deleteMyEducation);
router.get("/me/profile/achievements", authMiddleware, userController.getMyAchievements);
router.post("/me/profile/achievements", authMiddleware, userController.addMyAchievement);
router.put("/me/profile/achievements/:achievementId", authMiddleware, userController.updateMyAchievement);
router.delete("/me/profile/achievements/:achievementId", authMiddleware, userController.deleteMyAchievement);
router.post("/me/profile/blood-group", authMiddleware, userController.updateMyBloodGroup);


