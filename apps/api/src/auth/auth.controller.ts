import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginWithCodeDto } from './dto/login-with-code.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendEmailCodeDto } from './dto/send-email-code.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register/send-code')
  sendRegisterCode(@Body() payload: SendEmailCodeDto) {
    return this.authService.sendRegisterCode(payload.email);
  }

  @Post('register')
  register(@Body() payload: RegisterDto) {
    return this.authService.register(payload);
  }

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload.email, payload.password);
  }

  @Post('login/send-code')
  sendLoginCode(@Body() payload: SendEmailCodeDto) {
    return this.authService.sendLoginCode(payload.email);
  }

  @Post('login/code')
  loginWithCode(@Body() payload: LoginWithCodeDto) {
    return this.authService.loginWithCode(payload);
  }

  @Post('password/send-code')
  sendPasswordResetCode(@Body() payload: SendEmailCodeDto) {
    return this.authService.sendPasswordResetCode(payload.email);
  }

  @Post('password/reset')
  resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPassword(payload);
  }

  @Post('password/change/send-code')
  @UseGuards(JwtAuthGuard)
  sendChangePasswordCode(@CurrentUser() user: { userId: string }) {
    return this.authService.sendChangePasswordCode(user.userId);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: { userId: string },
    @Body() payload: ChangePasswordDto
  ) {
    return this.authService.changePassword(user.userId, payload);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@CurrentUser() user: { userId: string }) {
    return this.authService.getProfile(user.userId);
  }
}
