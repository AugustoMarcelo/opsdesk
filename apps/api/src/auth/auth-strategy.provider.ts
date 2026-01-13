import { Provider } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';

export const AuthStrategyProvider: Provider = {
  provide: 'AUTH_STRATEGY',
  useClass:
    process.env.AUTH_MODE === 'local' ? JwtStrategy : KeycloakJwtStrategy,
};
