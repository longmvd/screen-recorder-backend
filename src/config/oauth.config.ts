export const getGoogleOAuthConfig = () => ({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:3000/auth/google/callback',
  scope: ['email', 'profile'],
});

export const getFacebookOAuthConfig = () => ({
  clientID: process.env.FACEBOOK_APP_ID || '',
  clientSecret: process.env.FACEBOOK_APP_SECRET || '',
  callbackURL:
    process.env.FACEBOOK_CALLBACK_URL ||
    'http://localhost:3000/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name', 'picture'],
  scope: ['email'],
});
