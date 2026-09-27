import nodemailer from 'nodemailer';

/**
 * Transactional Email Service using Nodemailer
 * Designed with strict fail-open resilience: if SMTP credentials are not configured
 * or an SMTP error occurs, the failure is logged without crashing the request pipeline.
 */
export const sendTransactionalEmail = async ({ to, subject, text, html }) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPass) {
    // Fail-open when email credentials are not configured in .env
    return {
      sent: false,
      mode: 'SIMULATED_NO_SMTP_CONFIG',
      recipient: to,
      subject,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"CampusHire Placement Cell" <${emailUser}>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.warn(`[EmailService] Failed to send email to ${to}: ${error.message}`);
    return {
      sent: false,
      error: error.message,
    };
  }
};
