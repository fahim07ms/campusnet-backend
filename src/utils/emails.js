const nodeMailer = require("nodemailer");

const sendVerificationEmail = async (email, token, firstName) => {
    // Configure mail service
    const transporter = nodeMailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your CampusNet Account',
        html: `
            <h2>Welcome to CampusNet, ${firstName}!</h2>
            <p>Please click the link below to verify your account:</p>
            <a href="${verificationUrl}">Verify Email</a>
            <p>If you didn't create this account, please ignore this email.</p>
        `
    })
};

const sendPasswordResetEmail = async (email, token, firstName) => {
    const transporter = nodeMailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Reset Your CampusNet Password',
        html: `
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>You requested to reset your password. Click the link below:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `
    });
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
}