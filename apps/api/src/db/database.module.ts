import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DbExecutor } from './db-executor.service';

@Module({
  providers: [DatabaseService, DbExecutor],
  exports: [DatabaseService, DbExecutor],
})
export class DatabaseModule {}
