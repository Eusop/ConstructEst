import dns from 'node:dns';
import nodemailer from 'nodemailer';

// nodemailer resolves SMTP hostnames via Node's dns.Resolver (c-ares),
// which is a *different* code path from dns.lookup (the OS's own
// getaddrinfo). On some machines — including whatever set up DNS on this
// dev box, per `dns.getServers()` returning `['127.0.0.1']`, a loopback
// address that doesn't actually answer queries — c-ares ends up pointed at
// a nameserver that never responds, so every dns.resolve4/6 call sits
// through several retries before finally timing out (~55-65s observed
// here), even though dns.lookup (what fetch/net/the browser/nslookup all
// use) resolves the exact same hostname in well under a second. Pointing
// dns.setServers() at a real public DNS server doesn't help either — it's
// not a wrong-server-address problem, since the retries still fail the same
// way. Only actually routing through dns.lookup instead of c-ares fixes it,
// so nodemailer's dns.Resolver is patched to delegate there. Safe to do
// unconditionally at module load: nodemailer only ever consults
// dns.Resolver lazily, inside sendMail() (see its shared/resolveHostname.js
// — `new dns.Resolver(options)` is called at connection time, not at
// import time), so patching it here, before any sendMail() call happens,
// is enough regardless of import order.
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

// Gmail SMTP via a personal account's App Password (2-Step Verification
// required on that account — Gmail rejects the normal account password for
// SMTP). One exported function, specific to this one use case — no generic
// "email templates" system, matching how every other service file here
// (token.service.js, constants.service.js) stays small and targeted.
// Explicit timeouts — without them, a bad/blank App Password (or Gmail just
// being slow to respond) left a registration attempt hanging for close to a
// minute with zero feedback before finally failing, which read as "nothing
// happens" rather than an actual error. 10s is generous for a real SMTP
// round-trip but still fast enough that a genuine misconfiguration surfaces
// immediately as EMAIL_SEND_FAILED instead of a silent, unexplained wait.
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

/** Sends the 6-digit email-ownership verification code. Throws on failure —
 * callers (register/resendVerificationCode in auth.controller.js) decide
 * what a failed send means for the account. */
export async function sendVerificationCodeEmail(toEmail, code) {
  await transporter.sendMail({
    from: `"ConstructEst" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your ConstructEst verification code',
    text: `Your ConstructEst verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your ConstructEst verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
  });
}
