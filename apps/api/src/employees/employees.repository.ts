import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../database/drizzle.provider.js';
import { employee } from '../database/schema.js';

@Injectable()
export class EmployeesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll() {
    return this.db.select().from(employee).orderBy(employee.fullName);
  }

  async findById(id: number) {
    const rows = await this.db.select().from(employee).where(eq(employee.id, id)).limit(1);
    return rows[0];
  }
}
