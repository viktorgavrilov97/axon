import { Resend } from "resend";
import { OtpType } from "@prisma/client";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL;

// Validate environment variables at module load
if (!resendApiKey) {
  console.error("❌ RESEND_API_KEY environment variable is not set");
}

if (!fromEmail) {
  console.error("❌ RESEND_FROM_EMAIL environment variable is not set");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendOtpEmail(
  email: string,
  code: string,
  type: OtpType
) {
  if (!resendApiKey) {
    const error = "RESEND_API_KEY environment variable is not set";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  if (!fromEmail) {
    const error = "RESEND_FROM_EMAIL environment variable is not set";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  if (!resend) {
    const error = "Resend client not initialized";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  const subject =
    type === "EMAIL_VERIFICATION"
      ? "Your verification code"
      : type === "PASSWORD_RESET"
      ? "Your password reset code"
      : "Your two-factor authentication code";

  const purpose =
    type === "EMAIL_VERIFICATION"
      ? "verify your email address"
      : type === "PASSWORD_RESET"
      ? "reset your password"
      : "complete your login";
  
  try {
    console.log(`📧 Attempting to send OTP email to ${email} (type: ${type})`);
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject,
      html: `
        <div style="background-color: #000000; color: #ffffff; padding: 40px; font-family: sans-serif;">
          <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">${subject}</h1>
          <p style="color: #ffffff; font-size: 15px; margin-bottom: 30px;">
            Use the code below to ${purpose}:
          </p>
          <div style="background-color: #1a1a1a; border: 1px solid #545454; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="color: #ffffff; font-size: 32px; letter-spacing: 8px; font-weight: 600;">${code}</span>
          </div>
          <p style="color: #828282; font-size: 13px; margin-top: 30px;">
            This code will expire in 15 minutes.
          </p>
        </div>
      `,
    });

    if (result.error) {
      const errorMessage = result.error.message || "Failed to send email";
      console.error("❌ Resend API error:", {
        message: errorMessage,
        error: result.error,
        email,
        type,
      });
      throw new Error(errorMessage);
    }

    console.log(`✅ OTP email sent successfully to ${email} (type: ${type})`);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", {
      error: error instanceof Error ? error.message : String(error),
      email,
      type,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Send password reset email with token link
 */
export async function sendPasswordResetEmail(email: string, resetToken: string) {
  if (!resendApiKey) {
    const error = "RESEND_API_KEY environment variable is not set";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  if (!fromEmail) {
    const error = "RESEND_FROM_EMAIL environment variable is not set";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  if (!resend) {
    const error = "Resend client not initialized";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  const projectName = process.env.PROJECT_NAME || "Axon";

  try {
    console.log(`📧 Attempting to send password reset email to ${email}`);
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Восстановление доступа к вашему аккаунту",
      html: `
        <div style="background-color: #000000; color: #ffffff; padding: 40px; font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Восстановление доступа</h1>
          <p style="color: #ffffff; font-size: 15px; margin-bottom: 30px; line-height: 1.6;">
            Здравствуйте!
          </p>
          <p style="color: #ffffff; font-size: 15px; margin-bottom: 30px; line-height: 1.6;">
            Вы запросили восстановление пароля.
          </p>
          <p style="color: #ffffff; font-size: 15px; margin-bottom: 30px; line-height: 1.6;">
            Чтобы создать новый пароль, перейдите по ссылке ниже:
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetLink}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 15px; font-weight: 600;">
              👉 Восстановить пароль
            </a>
          </div>
          <p style="color: #828282; font-size: 13px; margin-top: 30px; line-height: 1.6;">
            Ссылка активна в течение 30 минут.
          </p>
          <p style="color: #828282; font-size: 13px; margin-top: 15px; line-height: 1.6;">
            Если вы не запрашивали восстановление — просто проигнорируйте это письмо.
          </p>
          <p style="color: #828282; font-size: 13px; margin-top: 30px; line-height: 1.6;">
            С уважением,<br>
            Команда ${projectName}
          </p>
        </div>
      `,
    });

    if (result.error) {
      const errorMessage = result.error.message || "Failed to send email";
      console.error("❌ Resend API error:", {
        message: errorMessage,
        error: result.error,
        email,
      });
      throw new Error(errorMessage);
    }

    console.log(`✅ Password reset email sent successfully to ${email}`);
  } catch (error) {
    console.error("❌ Failed to send password reset email:", {
      error: error instanceof Error ? error.message : String(error),
      email,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Send password change notification email
 */
export async function sendPasswordChangeNotification(email: string) {
  const projectName = process.env.PROJECT_NAME || "Axon";
  
  if (!resendApiKey) {
    const error = "RESEND_API_KEY environment variable is not set";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  if (!fromEmail) {
    const error = "RESEND_FROM_EMAIL environment variable is not set";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  if (!resend) {
    const error = "Resend client not initialized";
    console.error("❌ Email send failed:", error);
    throw new Error(error);
  }

  try {
    console.log(`📧 Attempting to send password change notification to ${email}`);
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Пароль успешно обновлён",
      html: `
        <div style="background-color: #000000; color: #ffffff; padding: 40px; font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Пароль обновлён</h1>
          <p style="color: #ffffff; font-size: 15px; margin-bottom: 30px; line-height: 1.6;">
            Здравствуйте!
          </p>
          <p style="color: #ffffff; font-size: 15px; margin-bottom: 30px; line-height: 1.6;">
            Ваш пароль был успешно изменён.
          </p>
          <p style="color: #ffffff; font-size: 15px; margin-bottom: 30px; line-height: 1.6;">
            Если вы не выполняли это действие — срочно восстановите доступ и свяжитесь с поддержкой.
          </p>
          <p style="color: #828282; font-size: 13px; margin-top: 30px; line-height: 1.6;">
            С уважением,<br>
            Команда ${projectName}
          </p>
        </div>
      `,
    });

    if (result.error) {
      const errorMessage = result.error.message || "Failed to send email";
      console.error("❌ Resend API error:", {
        message: errorMessage,
        error: result.error,
        email,
      });
      throw new Error(errorMessage);
    }

    console.log(`✅ Password change notification sent successfully to ${email}`);
  } catch (error) {
    console.error("❌ Failed to send password change notification:", {
      error: error instanceof Error ? error.message : String(error),
      email,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

