import { IsString, Matches } from 'class-validator';

export class KeycloakCallbackDto {
  @IsString()
  code!: string;

  @IsString()
  @Matches(/^https?:\/\/.+/)
  redirect_uri!: string;
}
