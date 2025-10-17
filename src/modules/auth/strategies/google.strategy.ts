import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { getGoogleOAuthConfig } from '../../../config/oauth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super(getGoogleOAuthConfig());
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;

    const result = await this.authService.validateOAuthUser(
      'google',
      id,
      emails[0].value,
      {
        firstName: name.givenName,
        lastName: name.familyName,
        avatar: photos[0].value,
      },
    );

    done(null, result);
  }
}
