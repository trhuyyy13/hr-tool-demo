import { Inject, Injectable } from '@nestjs/common';
import { eq, ilike } from 'drizzle-orm';
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

  // UC-001: login looks up by the email Google (in demo mode: the login
  // picker) returns. Case-insensitive — rejecting a real email over casing
  // would be bad UX even in a demo.
  async findByEmail(email: string) {
    const rows = await this.db.select().from(employee).where(ilike(employee.email, email)).limit(1);
    return rows[0];
  }
}
