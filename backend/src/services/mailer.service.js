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
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

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
