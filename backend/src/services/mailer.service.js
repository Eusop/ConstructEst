import * as brevo from '@getbrevo/brevo';
import 'dotenv/config';

// Railway blocks outbound SMTP on both port 465 and 587, so raw SMTP (the
// original Nodemailer/Gmail setup) times out in production regardless of
// credentials. Brevo sends over regular HTTPS instead of an SMTP socket,
// which is never blocked. Landed here after Resend (sandbox sender only
// reliably delivers to the Resend account's own email — a real blocker for
// other people registering with their own address) and SendGrid (its
// automated account-vetting rejected signup outright, no reason given).
// Brevo's Single Sender Verification (one email address you own, no domain
// purchase needed) works the same way SendGrid's would have: once verified,
// it can send to anyone.
let client;
function getClient() {
  if (!client) {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not set — add it to backend/.env to enable email sending.');
    }
    client = new brevo.TransactionalEmailsApi();
    client.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  }
  return client;
}

// Must be exactly the address verified in Brevo (Senders, Domains & Dedicated
// IPs > Senders > Single Sender) — Brevo rejects any other "from" address
// outright, so there is no safe placeholder default here.
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const FROM_NAME = process.env.BREVO_FROM_NAME || 'ConstructEst';

async function send({ to, subject, text, html }) {
  if (!FROM_EMAIL) {
    throw new Error('BREVO_FROM_EMAIL is not set — must match the address verified in Brevo.');
  }
  const email = new brevo.SendSmtpEmail();
  email.sender = { email: FROM_EMAIL, name: FROM_NAME };
  email.to = [{ email: to }];
  email.subject = subject;
  email.textContent = text;
  email.htmlContent = html;

  try {
    await getClient().sendTransacEmail(email);
  } catch (err) {
    // Brevo's error body nests the useful message under
    // response.body.message — the bare err.message is usually just the
    // generic HTTP status text, not helpful for figuring out what failed.
    const message = err?.response?.body?.message || err.message || 'Failed to send email via Brevo';
    throw new Error(message);
  }
}

/** Sends the 6-digit code used to reset a forgotten password. Same shape as
 * the signup code above but worded for a reset, so a code arriving in an
 * inbox is never ambiguous about which flow asked for it. */
export async function sendPasswordResetCodeEmail(toEmail, code) {
  await send({
    to: toEmail,
    subject: 'Reset your ConstructEst password',
    text: `Your ConstructEst password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email — your password has not changed.`,
    html: `<p>Your ConstructEst password reset code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p><p style="color:#555">If you did not request this, you can ignore this email — your password has not been changed.</p>`,
  });
}

/** Heads-up that a password was just changed. Sent after the change has
 * already been saved, so the caller must swallow any failure rather than
 * reporting an error for a password that did in fact change. */
export async function sendPasswordChangedEmail(toEmail, name) {
  await send({
    to: toEmail,
    subject: 'Your ConstructEst password was changed',
    text: `Hi ${name || 'there'}, the password for your ConstructEst account was just changed. If this was not you, contact your administrator right away.`,
    html: `<p>Hi ${name || 'there'},</p><p>The password for your ConstructEst account was just changed.</p><p style="color:#b3261e"><strong>If this was not you, contact your administrator right away.</strong></p>`,
  });
}

/** Sends the 6-digit verification code. Throws on failure, whoever calls
 * this (register/resendVerificationCode) handles what to do about it. */
export async function sendVerificationCodeEmail(toEmail, code) {
  await send({
    to: toEmail,
    subject: 'Your ConstructEst verification code',
    text: `Your ConstructEst verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your ConstructEst verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
}
