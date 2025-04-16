const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Create SMTP transporter using environment variables
        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'email-smtp.eu-central-1.amazonaws.com',
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.AWS_ACCESS_KEY_ID,
                    pass: process.env.AWS_SECRET_ACCESS_KEY
                },
                tls: {
                    ciphers: 'SSLv3'
                }
            });
            console.log('Email transporter initialized successfully');
        } catch (error) {
            console.error('Failed to initialize email transporter:', error);
        }
    }

    // Common HTML template for all emails
    getEmailTemplate(subject, content, user) {
        const nickname = user?.nickname || user?.email || 'there';
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .content { margin-bottom: 30px; }
                    .footer { text-align: center; font-size: 12px; color: #666; }
                    .button { 
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #007bff;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${subject}</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${nickname},</p>
                        ${content}
                    </div>
                    <div class="footer">
                        <p>This is an alpha test email from bossme.me</p>
                        <p>To unsubscribe, <a href="mailto:${process.env.EMAIL_FROM}?subject=unsubscribe">click here</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    async sendEmail(to, subject, html) {
        if (!to || !subject || !html) {
            throw new Error('Missing required email parameters: to, subject, or html');
        }

        if (!this.transporter) {
            this.initializeTransporter();
            if (!this.transporter) {
                throw new Error('Email transporter not available');
            }
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: to,
                subject: subject,
                html: html,
                headers: {
                    'List-Unsubscribe': `<mailto:${process.env.EMAIL_FROM}?subject=unsubscribe>`
                }
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent to ${to}: ${subject}`);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    async sendWelcomeEmail(user) {
        if (!user || !user.email) {
            throw new Error('Missing required user data for welcome email');
        }

        const subject = 'Welcome to BossMe.me Alpha!';
        const content = `
            <p>Thank you for joining the BossMe.me alpha! We're excited to have you on board as one of our first users.</p>
            <p>As an alpha tester, you'll get to:</p>
            <ul>
                <li>Share and enjoy memes with the community</li>
                <li>Help shape the future of BossMe.me</li>
                <li>Get early access to new features</li>
            </ul>
            <p>Ready to start? Click below to visit BossMe.me:</p>
            <p style="text-align: center;">
                <a href="${process.env.CLIENT_BASE_URL}" class="button">Visit BossMe.me</a>
            </p>
        `;

        const html = this.getEmailTemplate(subject, content, user);
        return this.sendEmail(user.email, subject, html);
    }

    async sendVerificationEmail(user, verificationToken) {
        if (!user || !user.email || !verificationToken) {
            throw new Error('Missing required data for verification email');
        }

        const verificationUrl = `${process.env.CLIENT_BASE_URL}/verify-email?token=${verificationToken}`;
        const subject = 'Verify Your BossMe.me Alpha Account';
        const content = `
            <p>Thank you for signing up for BossMe.me alpha! Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
            </p>
            <p>If you didn't create an account with BossMe.me, please ignore this email.</p>
        `;

        const html = this.getEmailTemplate(subject, content, user);
        return this.sendEmail(user.email, subject, html);
    }

    async sendPasswordResetEmail(user, resetToken) {
        if (!user || !user.email || !resetToken) {
            throw new Error('Missing required data for password reset email');
        }

        const resetUrl = `${process.env.CLIENT_BASE_URL}/reset-password?token=${resetToken}`;
        const subject = 'Password Reset Request - BossMe.me Alpha';
        const content = `
            <p>You requested a password reset for your BossMe.me alpha account. Click the button below to reset your password:</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
            <p>This link will expire in 1 hour for security reasons.</p>
        `;

        const html = this.getEmailTemplate(subject, content, user);
        return this.sendEmail(user.email, subject, html);
    }

    // Verify that the email service is working correctly
    async verifyConnection() {
        try {
            if (!this.transporter) {
                this.initializeTransporter();
            }
            const result = await this.transporter.verify();
            return { success: true, message: 'Email service connection verified' };
        } catch (error) {
            console.error('Email service connection failed:', error);
            return { 
                success: false, 
                message: 'Email service connection failed', 
                error: error.message 
            };
        }
    }
}

module.exports = new EmailService(); 