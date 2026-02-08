import { applyDecorators, UseGuards } from '@nestjs/common';
import { GqlAdminGuard } from '../guards/gql-admin.guard';
import { GqlAuthGuard } from '../guards/gql-auth.guard';

export function Authorization() {
  return applyDecorators(UseGuards(GqlAuthGuard));
}

export function AdminOnly() {
  return applyDecorators(UseGuards(GqlAuthGuard, GqlAdminGuard));
}
