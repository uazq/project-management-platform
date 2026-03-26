import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendResetPasswordEmail = async (to: string, token: string) => {
  const resetLink = `http://localhost:5173/reset-password?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'إعادة تعيين كلمة المرور - نظام إدارة المشاريع',
    html: `
      <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb; text-align: center;">إعادة تعيين كلمة المرور</h2>
        <p style="font-size: 16px; line-height: 1.6;">لقد تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بك. الرجاء الضغط على الرابط أدناه:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">إعادة تعيين كلمة المرور</a>
        </div>
        <p style="font-size: 14px; color: #666;">هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
        <p style="font-size: 14px; color: #666;">إذا لم تطلب هذا، يرجى تجاهل هذه الرسالة.</p>
        <hr style="border: 1px solid #f0f0f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">نظام إدارة المشاريع - جميع الحقوق محفوظة</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};