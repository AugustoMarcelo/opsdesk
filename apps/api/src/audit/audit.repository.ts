import { auditLog } from './../db/schema/audit-log';
import { DBExecutor } from './../db/db-executor.type';
import { Injectable } from '@nestjs/common';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  performedBy: string;
}

@Injectable()
export class AuditRepository {
  async log(db: DBExecutor, data: AuditLogData): Promise<void> {
    await db.insert(auditLog).values({
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      metadata: data.metadata,
      performedBy: data.performedBy,
    });
  }
}
