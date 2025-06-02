const express = require('express');
const router = express.Router();
const {
    register,
    login,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
    logout
} = require('../controllers/authController');

const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/register', register);

router.post('/login', login);

router.post('/verify-email?token', verifyEmail);

router.post('/resend-verification-email', resendVerificationEmail);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password?token', resetPassword);

router.post('/refresh-token', refreshToken, authenticateToken);

router.post('/logout', logout, authenticateToken);



module.exports = router;