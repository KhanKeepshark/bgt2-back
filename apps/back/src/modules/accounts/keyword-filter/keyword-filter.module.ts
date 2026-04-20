import { Module } from '@nestjs/common';
import { KeywordFilterService } from './keyword-filter.service';
import { KeywordFilterResolver } from './keyword-filter.resolver';

@Module({
  providers: [KeywordFilterService, KeywordFilterResolver],
  exports: [KeywordFilterService],
})
export class KeywordFilterModule {}
