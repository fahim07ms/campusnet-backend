const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const nodeMailer = require("nodemailer");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

// Import authentication model
const AuthModel = require("../models/authModel");

// Normal Utility Functions
const {
    generateRandomToken,
    hashToken,
    generateAccessToken,
    generateRefreshToken,
} = require("../utils/utils");

// Email Utility Functions
const {
    sendVerificationEmail,
    sendPasswordResetEmail,
} = require("../utils/emails");

// Error Function Utility
const customError = require("../utils/errors");
const {findUserByEmail, findRefreshTokenByTokenHash} = require("../models/authModel");

// Rate Limiting Configurations
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: "Too many login attempts, please try again after an hour" },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again after an hour" },
});

/***************************
* Authentication Controllers
****************************/

// Register
const register = async (req, res) => {
    const { client } = await pool.connect();

    try {
        const { email, username, firstName, lastName, password, confirmPassword } = req.body;

        // Input validation
        if (!email || !username || !firstName || !lastName || !password || !confirmPassword) {
            return res.status(400).json(customError.badRequest({
                message: "All fields are required"
            }));
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json(customError.badRequest({
                message: "Password must be at least 8 characters"
            }));
        }

        // Match typed password
        if (password !== confirmPassword) {
            return res.status(400).json(customError.badRequest({
                message: "Passwords do not match",
            }))
        }

        await client.query('BEGIN');
        // Extract domain from email and validate if university is present or not
        const universityDomain = email.split("@")[1];
        const university = await AuthModel.findUniversityByDomain(client, universityDomain);
        if (!university) {
            await client.query('ROLLBACK');
            return res.status(404).json(customError.notFound({
                message: "University not found"
            }));
        }

        // Check if the user already exists
        const existingUser = await AuthModel.findUserByEmail(client, email);

        if (existingUser) {
            await client.query('ROLLBACK');
            return res.status(409).json(customError.conflict({
                message: "A user with the provided email address already exists.",
            }));
        }

        // Hash password and generate a verification token
        const passwordHash = await bcrypt.hash(password, 12);
        const verificationToken = generateRandomToken();

        // Create User
        const userId = await AuthModel.createUser(client, {email, username, firstName, lastName, passwordHash, verificationToken, universityId:university.id});

        await client.query('COMMIT');

        // Send verification email
        await sendVerificationEmail(email, verificationToken, firstName);

        res.status(201).json({
            message: "Registration successful. Please check your email for verification.",
            data: {
                userId: user.id,
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration failed with error: ', error);
        res.status(500).json(customError.internalServerError({
            message: 'Registration failed',
        }));
    } finally {
        client.release();
    }
};

// Login Controller
const login = async (req, res) => {
    const {client} = await pool.connect();

    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json(customError.badRequest({
                message: "Request validation failed for 1 field",
                details: [
                    {
                        field: "email",
                        message: "Email field is required",
                    }
                ]
            }));
        }
        if (!password) {
            return res.status(400).json(customError.badRequest({
                message: "Request validation failed for 1 field",
                details: [
                    {
                        field: "password",
                        message: "Password field is required",
                    }
                ]
            }));
        }

        // Get user
        const user = await AuthModel.findUserByEmail(client, email);

        if (!user) {
            return res.status(404).json(customError.notFound({
                message: "User not found"
            }));
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json(customError.unauthorized({
                message: "Invalid credentials"
            }));
        }

        // Check if email is verified
        if (!email.is_verified) {
            return res.status(403).json(customError.forbidden({
                message: "Please verify your email before logging in."
            }));
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Store hashed refresh token in the database
        const refreshTokenHash = hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + process.env.REFRESH_TOKEN_EXPIRY);

        await client.query(`BEGIN`);
        // Insert refresh token into the database
        await AuthModel.insertRefreshToken(client, user.id, refreshTokenHash, req.ip, req.get('User-Agent'), expiresAt);

        // Get user profile
        const userProfile = await AuthModel.getUserProfileById(client, user.id);

        // Update last login
        await AuthModel.updateLastLogin();

        // Update user is_active to true
        await AuthModel.updateUserIsActive(client, user.id, true);

        // Return user data
        const userData = await AuthModel.userDataFromId();

        await client.query('COMMIT');
        req.cookies("refreshToken", refreshToken);

        res.status(201).json({
            message: "Login successful",
            data: {
                accessToken,
                user: userData,
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Login failed with error: ', error);
        res.status(500).json(customError.internalServerError({
            message: 'Login failed',
        }));
    } finally {
        client.release();
    }
}

// Verify Email
const verifyEmail = async (req, res) => {
    const {client} = await pool.connect();

    try {
        const { token } = req.query;

        // Check if token is present
        if (!token) {
            return res.status(400).json(customError.badRequest({
                message: "Verification token is required"
            }));
        }

        // Check if the verification token is valid or not
        const user = await AuthModel.findUserByVerificationToken(client, token);

        if (!user) {
            return res.status(400).json(customError.badRequest({
                message: "Invalid or expired verification token"
            }));
        }

        // Update user is_verified to true
        await AuthModel.updateUserVerificationToken(client, user.id, true, null);

        res.status(201).json({
            message: "Email verified successfully",
        });
    } catch (error) {
        console.error('Verification failed with error: ', error);
        res.status(500).json(customError.internalServerError({
            message: 'Verification failed',
        }));
    } finally {
        client.release();
    }
}

// Resend Verification Email
const resendVerificationEmail = async (req, res) => {
    const {client} = await pool.connect();

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json(customError.badRequest({
                message: "Verification email resend request failed for 1 field",
                details: [
                    {
                        field: "email",
                        message: "Email address is required"
                    }
                ]
            }));
        }

        // User with user profile
        const user = await AuthModel.findUserByEmail(client, email);

        // Sending success to prevent email enumeration
        if (!user) {
            return res.status(200).json({
                message: "If the email exists, verification email has been sent."
            });
        }

        // If user is already verified, do not send another verification email
        if (user.is_verified) {
            return res.status(400).json(customError.badRequest({
                message: "Email is already verified"
            }));
        }

        // Generate new verification token
        const verificationToken = generateRandomToken();

        await AuthModel.updateUserVerificationToken(client, user.id, false, verificationToken);
        const firstNameResult = await client.query(`SELECT first_name FROM user_profiles WHERE user_id = $1`, [user.id]);
        await sendVerificationEmail(email, verificationToken, firstNameResult.rows[0].first_name);
        res.status(200).json({
            message: "Verification email sent!"
        });
    } catch (error) {
        console.error("Resend verification error: ", error);
        res.status(500).json(customError.internalServerError({
            message: "Failed to resend verification email"
        }));
    } finally {
        client.release();
    }
}

// Forgot Password
const forgotPassword = async (req, res) => {
    const { client } = pool.connect();

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json(customError.badRequest({
                message: "Verification email resend request failed for 1 field",
                details: [
                    {
                        field: "email",
                        message: "Email address is required"
                    }
                ]
            }));
        }

        // User with user profile
        const user = await findUserByEmail(client, email);

        if (!user) {
            return res.status(200).json({
                message: "If the email exists, password reset instructions have been sent."
            });
        }

        // Generate reset token
        const resetToken = generateRandomToken();
        const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

        // Update reset token and reset token expires
        await AuthModel.updatePasswordResetToken(client, user.id, resetToken, resetTokenExpires);
        const firstNameResult = await client.query(`SELECT first_name FROM user_profiles WHERE user_id = $1`, [user.id]);

        // Send password reset email
        await sendPasswordResetEmail(email, resetToken, firstNameResult.rows[0].first_name);

        res.status(200).json({
            message: "Password reset instructions sent to your email."
        });
    } catch (error) {
        console.error("Password reset error: ", error);
        res.status(500).json(customError.internalServerError({
            message: "Failed to process password reset request"
        }));
    } finally {
        client.release();
    }
};

const resetPassword = async (req, res) => {
    const { client } = pool.connect();

    try {
        const { token, newPassword, confirmNewPassword } = req.body;
        if (!token) {
            return res.status(400).json(customError.badRequest({
                    message: "Token is required",
                    details: [
                        {
                            field: "token",
                            message: "Token is required"
                        }
                    ]
                })
            )
        } else if (!newPassword) {
            return res.status(400).json(customError.badRequest({
                    message: "New password is required",
                    details: [
                        {
                            field: "newPassword",
                            message: "New password is required"
                        }
                    ]
                })
            )
        } else if (!confirmNewPassword) {
            return res.status(400).json(customError.badRequest({
                    message: "Confirm new password is required",
                    details: [
                        {
                            field: "confirmNewPassword",
                            message: "Confirm new password is required"
                        }
                    ]
                })
            )
        }

        // Check password length
        if (newPassword.length < 8) {
            return res.status(400).json(customError.badRequest({
                    message: "Password must be at least 8 characters"
                })
            );
        }

        // Check password and confirmed password match
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json(customError.badRequest({
                    message: "Passwords do not match"
                })
            );
        }

        // Find user with the valid reset token
        const user = await AuthModel.findUserByValidResetToken(client, token);
        if (!user) {
            return res.status(400).json(customError.badRequest({
                    message: "Invalid or expired reset token"
                })
            );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await client.query(`BEGIN`);

        // Update password and clear reset token
        await AuthModel.updatePassword(client, user.id, passwordHash);

        // Invalidate all existing refresh tokens (force re-login on all devices)
        await AuthModel.invalidateRefreshToken(client, user.id);

        await client.query(`COMMIT`);

        res.status(200).json({
            message: "Password reset successful"
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Password reset error: ", error);
        res.status(500).json(customError.internalServerError({
            message: "Failed to process password reset request"
        }));
    } finally {
        client.release();
    }
};

// Refresh token controller
const refreshToken = async (req, res) => {
    const { client } = pool.connect();

    try {
        const refreshToken = req.cookies.refreshToken;

        // Check if refresh token is available or not
        if (!refreshToken) {
            return res.status(401).json(customError.unauthorized({
                message: "Refresh token is required"
            }));
        }

        // Verify refresh token
        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            return res.status(401).json(customError.unauthorized({
                message: "Invalid refresh token"
            }));
        }

        // Check if refresh token exists in database
        const refreshTokenHash = hashToken(refreshToken);
        const refreshTokenData = await findRefreshTokenByTokenHash(client, refreshTokenHash, payload.userId);

        if (!refreshTokenData) {
            return res.status(401).json(customError.unauthorized({
                message: "Refresh token not found or expired"
            }));
        }

        const userId = payload.userId;
        // Verify user still exists and is active
        const user = await AuthModel.findActiveUserById(client, userId);

        if (!user) {
            return res.status(404).json(customError.notFound({
                message: "User not found"
            }))
        }

        // Generate new tokens (token rotation)
        const accessToken = generateAccessToken(userId);
        const newRefreshToken = generateRefreshToken(userId);

        await client.query(`BEGIN`);

        // Invalidate old refresh token
        await AuthModel.invalidateRefreshToken(client, userId);

        // Store new refresh token
        const newRefreshTokenHash = hashToken(newRefreshToken);
        const newRefreshTokenExpiresAt = new Date(Date.now() + process.env.REFRESH_TOKEN_EXPIRY);

        // Insert new refresh token into the database
        await AuthModel.insertRefreshToken(client, userId, newRefreshTokenHash, req.ip, req.get('User-Agent'), newRefreshTokenExpiresAt);

        await client.query('COMMIT');

        res.status(200).json({
            message: "Token refreshed successfully",
            data: {
                accessToken
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error while refreshing token: ", error);
        res.status(500).json(customError.internalServerError({
            message: "Failed to refresh token"
        }));
    } finally {
        client.release();
    }
};

// Logout Controller
const logout = async (req, res) => {
    const { client } = await pool.connect();

    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json(customError.unauthorized({
                message: "Refresh token is required"
            }));
        }

        const refreshTokenHash = hashToken(refreshToken);

        // Invalidate the refresh tokens
        await AuthModel.invalidateRefreshToken(client, req.userId);

        res.status(200).json({
            message: "Logout successful"
        });
    } catch (error) {
        console.error("Logout error: ", error);
        res.status(500).json(customError.internalServerError({
            message: "Failed to logout"
        }));
    } finally {
        client.release();
    }
};

module.exports = {
    register,
    login,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
    logout
}