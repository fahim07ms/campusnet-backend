const express = require("express");
const userController = require("../controllers/userController.js");
const { authMiddleware } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.get("/", authMiddleware, userController.getUsers);

router.get("/me/profile", authMiddleware, userController.getMyProfile);


module.exports = {
    userRoutes: router,
};


