import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(UsersService) private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'development-secret')
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findByIdOrNull(payload.sub);

    if (!user) {
      throw new UnauthorizedException('当前登录状态已失效，请重新登录');
    }

    return {
      userId: payload.sub,
      email: payload.email
    };
  }
}
