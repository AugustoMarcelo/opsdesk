import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class KeycloakJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Otherwise, use the default Passport JWT authentication
    // super.canActivate returns a Promise<boolean> | boolean
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: Error | string | undefined,
  ): TUser {
    // If there's an error or no user, throw an UnauthorizedException
    if (err || !user) {
      // Log the error for debugging
      if (err) {
        console.error(
          '[KeycloakJwtAuthGuard] Authentication error:',
          err.message,
        );
      }
      if (info) {
        console.error('[KeycloakJwtAuthGuard] Authentication info:', info);
      }
      if (!user) {
        console.error('[KeycloakJwtAuthGuard] No user found');
      }

      const message =
        err?.message ||
        (typeof info === 'string'
          ? info
          : info?.message || 'Authentication failed');
      throw new UnauthorizedException(message);
    }

    return user;
  }
}
