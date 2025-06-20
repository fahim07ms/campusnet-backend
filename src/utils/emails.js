const nodeMailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const sendVerificationEmail = async (email, token, firstName) => {
    // Configure mail service
    const transporter = nodeMailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const verificationUrl =
        process.env.NODE_ENV === "production"
            ? `${process.env.FRONTEND_URL}/verify-email?token=${token}`
            : `http://localhost:3000/verify-email?token=${token}`;

    await transporter.sendMail({
        from: `"CampusNet Support" <${process.env.EMAIL_USER}>`, // Shows nice sender name
        to: email,
        subject: "Verify Your CampusNet Account",
        html: `
        <div style="font-family: 'Segoe UI', sans-serif; background: #f9f9f9; padding: 40px; color: #1f1f1f;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="margin-top: 0; color: #5928E4;">Welcome to CampusNet, ${firstName}!</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              We're excited to have you join our community. Please verify your email to activate your account.
            </p>
            <div style="margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #5928E4; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email
              </a>
            </div>
            <p style="font-size: 14px; color: #555;">If you didn't create this account, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #888;">This message was sent by CampusNet. Please do not reply directly to this email.</p>
          </div>
        </div>
      `,
    });
};

const sendPasswordResetEmail = async (email, token, firstName) => {
    const transporter = nodeMailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const resetUrl =
        process.env.NODE_ENV === "production"
            ? `${process.env.FRONTEND_URL}/reset-password?token=${token}`
            : `http://localhost:3000/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"CampusNet Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset Your CampusNet Password",
        html: `
        <div style="font-family: 'Segoe UI', sans-serif; background: #f9f9f9; padding: 40px; color: #1f1f1f;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="margin-top: 0; color: #5928E4;">Password Reset Request</h2>
            <p style="font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
            <p style="font-size: 16px; line-height: 1.6;">
              We received a request to reset your CampusNet password. Click the button below to proceed:
            </p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #5928E4; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 14px; color: #555;">This link will expire in 1 hour.</p>
            <p style="font-size: 14px; color: #555;">
              If you didn’t request this password reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #888;">This message was sent by CampusNet. Please do not reply directly to this email.</p>
          </div>
        </div>
      `,
    });
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
};
