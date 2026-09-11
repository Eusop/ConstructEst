import dns from 'node:dns';
import nodemailer from 'nodemailer';

// nodemailer uses Node's dns.Resolver to look up SMTP hosts, which is
// different from dns.lookup (what fetch/browsers use). On this machine
// dns.Resolver was pointed at a broken DNS server and kept timing out
// (~60s), even though dns.lookup resolves the same host fine. Tried
// dns.setServers() first but that didn't help, so we patch dns.Resolver
// to just use dns.lookup instead, this runs once when the file loads.
const OriginalResolver = dns.Resolver;
class LookupBackedResolver extends OriginalResolver {
  resolve4(hostname, callback) {
    dns.lookup(hostname, { family: 4, all: true }, (err, addresses) => callback(err, err ? undefined : addresses.map((a) => a.address)));
  }

  resolve6(hostname, callback) {
    dns.lookup(hostname, { family: 6, all: true }, (err, addresses) => callback(err, err ? undefined : addresses.map((a) => a.address)));
  }
}
dns.Resolver = LookupBackedResolver;

// Uses Gmail SMTP with an App Password (needs 2-Step Verification on that
// account, Gmail rejects the normal password for SMTP). Timeouts are set
// explicitly since a bad App Password would otherwise hang for almost a
// minute before failing, which just looked like the app was broken.
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

/** Sends the 6-digit code used to reset a forgotten password. Same shape as
 * the signup code above but worded for a reset, so a code arriving in an
 * inbox is never ambiguous about which flow asked for it. */
export async function sendPasswordResetCodeEmail(toEmail, code) {
  await transporter.sendMail({
    from: `"ConstructEst" <${process.env.GMAIL_USER}>`,
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
  await transporter.sendMail({
    from: `"ConstructEst" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your ConstructEst password was changed',
    text: `Hi ${name || 'there'}, the password for your ConstructEst account was just changed. If this was not you, contact your administrator right away.`,
    html: `<p>Hi ${name || 'there'},</p><p>The password for your ConstructEst account was just changed.</p><p style="color:#b3261e"><strong>If this was not you, contact your administrator right away.</strong></p>`,
  });
}

/** Sends the 6-digit verification code. Throws on failure, whoever calls
 * this (register/resendVerificationCode) handles what to do about it. */
export async function sendVerificationCodeEmail(toEmail, code) {
  await transporter.sendMail({
    from: `"ConstructEst" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your ConstructEst verification code',
    text: `Your ConstructEst verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your ConstructEst verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
}
