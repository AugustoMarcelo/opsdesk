import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class DbExecutor {
  constructor(private readonly database: DatabaseService) {}

  async transaction<T>(
    fn: (tx: typeof this.database.db) => Promise<T>,
  ): Promise<T> {
    const result = await this.database.db.transaction(async (tx) => {
      return fn(tx);
    });

    return result;
  }
}
