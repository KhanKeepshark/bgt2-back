import { Resolver } from '@nestjs/graphql';
import { OperationService } from './operation.service';

@Resolver('Operation')
export class OperationResolver {
  constructor(private readonly operationService: OperationService) {}
}
