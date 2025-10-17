import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { getFacebookOAuthConfig } from '../../../config/oauth.config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private authService: AuthService) {
    super(getFacebookOAuthConfig());
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;

    const result = await this.authService.validateOAuthUser(
      'facebook',
      id,
      emails?.[0]?.value || '',
      {
        firstName: name?.givenName || '',
        lastName: name?.familyName || '',
        avatar: photos?.[0]?.value || '',
      },
    );

    done(null, result);
  }
}
