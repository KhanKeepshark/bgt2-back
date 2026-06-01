import { Global, Module } from '@nestjs/common';
import { LimitGateService } from './limit-gate.service';

@Global()
@Module({
  providers: [LimitGateService],
  exports: [LimitGateService],
})
export class LimitGateModule {}
