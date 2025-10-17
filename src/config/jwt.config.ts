export const getJwtConfig = () => ({
  secret:
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  signOptions: {
    expiresIn: '15m' as const,
  },
});

export const getJwtRefreshConfig = () => ({
  secret:
    process.env.JWT_REFRESH_SECRET ||
    'your-super-secret-refresh-key-change-in-production',
  signOptions: {
    expiresIn: '7d' as const,
  },
});
