import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'ConstructEst <onboarding@resend.dev>';

async function send({ to, subject, text, html }) {
  const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, text, html });
  if (error) throw new Error(error.message || 'Failed to send email via Resend');
}

export async function sendPasswordResetCodeEmail(toEmail, code) {
  await send({
    to: toEmail,
    subject: 'Reset your ConstructEst password',
    text: `Your ConstructEst password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email — your password has not changed.`,
    html: `<p>Your ConstructEst password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p><p style="color:#555">If you did not request this, you can ignore this email — your password has not been changed.</p>`,
  });
}

export async function sendPasswordChangedEmail(toEmail, name) {
  await send({
    to: toEmail,
    subject: 'Your ConstructEst password was changed',
    text: `Hi ${name || 'there'}, the password for your ConstructEst account was just changed. If this was not you, contact your administrator right away.`,
    html: `<p>Hi ${name || 'there'},</p><p>The password for your ConstructEst account was just changed.</p><p style="color:#b3261e"><strong>If this was not you, contact your administrator right away.</strong></p>`,
  });
}

export async function sendVerificationCodeEmail(toEmail, code) {
  await send({
    to: toEmail,
    subject: 'Your ConstructEst verification code',
    text: `Your ConstructEst verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your ConstructEst verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
}
