const express = require("express");
const router = express.Router();
const {
    register,
    login,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
    logout,
} = require("../controllers/authController");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.post("/register", register);

router.post("/login", login);

router.get("/verify-email", verifyEmail);

router.post("/resend-verification-email", resendVerificationEmail);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/refresh-token", authMiddleware, refreshToken);

router.post("/logout", authMiddleware, logout);

module.exports = {
    authRoutes: router,
};
