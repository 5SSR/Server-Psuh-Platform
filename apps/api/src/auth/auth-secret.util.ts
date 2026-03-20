export function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'test') return 'test-jwt-secret';
  throw new Error('JWT_SECRET 未配置，拒绝启动认证模块');
}

export function resolveAuthCodeSecret() {
  const secret = process.env.AUTH_CODE_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === 'test') return 'test-auth-code-secret';
  throw new Error('AUTH_CODE_SECRET/JWT_SECRET 未配置，无法生成验证码摘要');
}
