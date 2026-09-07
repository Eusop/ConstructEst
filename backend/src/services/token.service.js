import jwt from 'jsonwebtoken';

/** JWT payload just carries the access role (user/admin), nothing that
 * needs to be re-derived or trusted from elsewhere. */
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
