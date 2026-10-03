import jwt from 'jsonwebtoken';

/** The JWT payload only holds the access role (user/admin). */
export function signToken(user) {
  return jwt.sign(
    // mustChangePassword: signed in with an admin's temporary password, so
    // requireAuth only allows setting a new one (auth.controller.js).
    { sub: user.id, userId: user.user_id, accessRole: user.access_role, ...(user.must_change_password ? { mustChangePassword: true } : {}) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
