// Pengiriman email (untuk fitur lupa password) via Gmail SMTP + App Password.
import nodemailer from "nodemailer";

export async function kirimEmail(to, subject, text) {
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("MAIL_USER / MAIL_APP_PASSWORD belum di-set.");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  await transporter.sendMail({ from: `Aston CRM <${user}>`, to, subject, text });
}
