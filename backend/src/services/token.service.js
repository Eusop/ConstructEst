import jwt from 'jsonwebtoken';

/**
 * The JWT payload carries only the derived, 2-level access role — never a
 * raw user "type" — so middleware never has to re-derive or trust anything
 * from the request itself.
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user.id, employeeId: user.employee_id, accessRole: user.access_role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
