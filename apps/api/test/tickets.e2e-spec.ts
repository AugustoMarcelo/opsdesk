import {
  roles,
  userRoles,
  permissions,
  rolePermissions,
} from './../src/db/schema';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { login } from './helpers/auth';
import { TicketsRepository } from '../src/tickets/tickets.repository';
import { DatabaseService } from '../src/db/database.service';
import { getTestModuleOverrides } from './helpers/test-module-overrides';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { UsersRepository } from '../src/users/users.repository';
import { cleanupDatabase } from './helpers/cleanup';

interface TicketResponse {
  id: string;
  title: string;
  description: string;
  status: string;
  ownerId: string;
  createdAt: string;
}

interface TicketListResponse {
  data: TicketResponse[];
  meta: {
    offset: number;
    limit: number;
    count: number;
  };
}

let customerToken: string;
let agentToken: string;
let customerId: string;
let ticketsRepository: TicketsRepository;
let usersRepository: UsersRepository;
let databaseService: DatabaseService;

describe('Tickets (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Ensure we're in test environment
    process.env.NODE_ENV = 'test';

    let testModule = Test.createTestingModule({
      imports: [AppModule],
    });

    // Apply common test overrides (test database + mocked RabbitMQ)
    for (const { module, override } of getTestModuleOverrides()) {
      testModule = testModule.overrideModule(module).useModule(override);
    }

    const moduleRef = await testModule.compile();

    app = moduleRef.createNestApplication();

    // Get repositories from DI container for use in tests
    ticketsRepository = moduleRef.get<TicketsRepository>(TicketsRepository);
    usersRepository = moduleRef.get<UsersRepository>(UsersRepository);
    databaseService = moduleRef.get<DatabaseService>(DatabaseService);

    // Set up global guards (same as main.ts)
    app.useGlobalGuards(moduleRef.get(JwtAuthGuard));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    const passwordHash = await bcrypt.hash('123456', 10);

    const [customerRole, agentRole] = await databaseService.db
      .insert(roles)
      .values([
        {
          name: 'Customer:e2e',
        },
        {
          name: 'Agent:e2e',
        },
      ])
      .onConflictDoNothing()
      .returning();

    const testCustomer = await usersRepository.create(databaseService.db, {
      name: 'Test Customer',
      email: 'customer@test.com',
      password: passwordHash,
      roleId: customerRole.id,
    });

    customerId = testCustomer.id;

    const testAgent = await usersRepository.create(databaseService.db, {
      name: 'Test Agent',
      email: 'agent@test.com',
      password: passwordHash,
      roleId: agentRole.id,
    });
    // Create all ticket-related permissions
    const [
      ticketCreatePermission,
      ticketReadPermission,
      ticketUpdatePermission,
      ticketClosePermission,
    ] = await databaseService.db
      .insert(permissions)
      .values([
        {
          name: 'ticket:create',
        },
        {
          name: 'ticket:read',
        },
        {
          name: 'ticket:update',
        },
        {
          name: 'ticket:close',
        },
      ])
      .returning();

    // Assign permissions to customer role
    await databaseService.db.insert(rolePermissions).values([
      {
        roleId: customerRole.id,
        permissionId: ticketCreatePermission.id,
      },
      {
        roleId: customerRole.id,
        permissionId: ticketReadPermission.id,
      },
      {
        roleId: customerRole.id,
        permissionId: ticketUpdatePermission.id,
      },
      {
        roleId: customerRole.id,
        permissionId: ticketClosePermission.id,
      },
    ]);

    await databaseService.db.insert(userRoles).values([
      {
        roleId: customerRole.id,
        userId: testCustomer.id,
      },
      {
        roleId: agentRole.id,
        userId: testAgent.id,
      },
    ]);

    customerToken = await login(app, 'customer@test.com', '123456');
    agentToken = await login(app, 'agent@test.com', '123456');
  });

  afterEach(async () => {
    // Cleanup test data but preserve setup data (users, roles, permissions created in beforeAll)
    // await cleanupDatabase(databaseService.db);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
      await cleanupDatabase(databaseService.db);
    }
  });

  describe('POST /v1/tickets', () => {
    it('should create a ticket successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Ticket e2e',
          description: 'create ticket e2e test',
        })
        .expect(201);

      const body = res.body as TicketResponse;

      expect(body).toHaveProperty('id');
      expect(body.title).toBe('Ticket e2e');
      expect(body.description).toBe('create ticket e2e test');
      expect(body.status).toBe('open');
      expect(body.ownerId).toBe(customerId);
      expect(body.createdAt).toBeDefined();

      // Verify ticket exists using repository
      const createdTicket = await ticketsRepository.findById(
        databaseService.db,
        body.id,
      );
      expect(createdTicket).not.toBeNull();
      expect(createdTicket?.title).toBe('Ticket e2e');
      expect(createdTicket?.status).toBe('open');
    });

    it('should return 403 when user lacks create permission', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/tickets')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          title: 'forbidden',
          description: 'nope',
        });

      expect(res.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/v1/tickets')
        .send({
          title: 'unauthorized',
          description: 'test',
        })
        .expect(401);
    });

    it('should return 400 when validation fails - missing title', async () => {
      await request(app.getHttpServer())
        .post('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          description: 'missing title',
        })
        .expect(400);
    });

    it('should return 400 when validation fails - missing description', async () => {
      await request(app.getHttpServer())
        .post('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'missing description',
        })
        .expect(400);
    });

    it('should return 400 when validation fails - title too short', async () => {
      await request(app.getHttpServer())
        .post('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'ab',
          description: 'valid description',
        })
        .expect(400);
    });

    it('should return 400 when validation fails - description too short', async () => {
      await request(app.getHttpServer())
        .post('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'valid title',
          description: 'abcd',
        })
        .expect(400);
    });

    it('should return 400 when empty body', async () => {
      await request(app.getHttpServer())
        .post('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /v1/tickets', () => {
    it('should list tickets with pagination', async () => {
      // Create some test tickets using repository
      await ticketsRepository.create(databaseService.db, {
        title: 'Ticket 1',
        description: 'Description 1',
        userId: customerId,
        status: 'open',
      });
      await ticketsRepository.create(databaseService.db, {
        title: 'Ticket 2',
        description: 'Description 2',
        userId: customerId,
        status: 'open',
      });
      await ticketsRepository.create(databaseService.db, {
        title: 'Ticket 3',
        description: 'Description 3',
        userId: customerId,
        status: 'closed',
      });

      const res = await request(app.getHttpServer())
        .get('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ offset: 0, limit: 10 })
        .expect(200);

      const body = res.body as TicketListResponse;

      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
      expect(body.meta.offset).toBe(0);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.count).toBeGreaterThanOrEqual(3);
    });

    it('should respect offset and limit parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ offset: 1, limit: 2 })
        .expect(200);

      const body = res.body as TicketListResponse;
      expect(body.meta.offset).toBe(1);
      expect(body.meta.limit).toBe(2);
      expect(body.data.length).toBeLessThanOrEqual(2);
    });

    it('should support ordering', async () => {
      const resAsc = await request(app.getHttpServer())
        .get('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ order: 'asc' })
        .expect(200);

      const resDesc = await request(app.getHttpServer())
        .get('/v1/tickets')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ order: 'desc' })
        .expect(200);

      const bodyAsc = resAsc.body as TicketListResponse;
      const bodyDesc = resDesc.body as TicketListResponse;

      expect(bodyAsc.data.length).toBeGreaterThan(0);
      expect(bodyDesc.data.length).toBeGreaterThan(0);

      // If we have multiple tickets, check ordering
      if (bodyAsc.data.length > 1 && bodyDesc.data.length > 1) {
        const ascDates = bodyAsc.data.map((t) =>
          new Date(t.createdAt).getTime(),
        );
        const descDates = bodyDesc.data.map((t) =>
          new Date(t.createdAt).getTime(),
        );

        // Check ascending order
        for (let i = 1; i < ascDates.length; i++) {
          expect(ascDates[i]).toBeGreaterThanOrEqual(ascDates[i - 1]);
        }

        // Check descending order
        for (let i = 1; i < descDates.length; i++) {
          expect(descDates[i]).toBeLessThanOrEqual(descDates[i - 1]);
        }
      }
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/v1/tickets').expect(401);
    });
  });

  describe('GET /v1/tickets/:id', () => {
    it('should return 404 when ticket does not exist', async () => {
      await request(app.getHttpServer())
        .get('/v1/tickets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);
    });

    it('should return ticket by id', async () => {
      // Create a ticket using repository
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Get Ticket Test',
        description: 'Test description',
        userId: customerId,
        status: 'open',
      });

      const res = await request(app.getHttpServer())
        .get(`/v1/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const body = res.body as { data: TicketResponse };
      expect(body.data.id).toBe(ticket.id);
      expect(body.data.title).toBe('Get Ticket Test');
      expect(body.data.description).toBe('Test description');
    });

    it('should return 401 when not authenticated', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Private Ticket',
        description: 'Test',
        userId: customerId,
        status: 'open',
      });

      await request(app.getHttpServer())
        .get(`/v1/tickets/${ticket.id}`)
        .expect(401);
    });
  });

  describe('PATCH /v1/tickets/:id', () => {
    it('should return 403 when user lacks update permission', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Update Test',
        description: 'Test',
        userId: customerId,
        status: 'open',
      });

      await request(app.getHttpServer())
        .patch(`/v1/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          title: 'Updated',
        })
        .expect(403);
    });

    it('should update ticket title and description', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Original Title',
        description: 'Original Description',
        userId: customerId,
        status: 'open',
      });

      await request(app.getHttpServer())
        .patch(`/v1/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated Description',
        })
        .expect(200);

      // Verify update using repository
      const updatedTicket = await ticketsRepository.findById(
        databaseService.db,
        ticket.id,
      );

      expect(updatedTicket?.title).toBe('Updated Title');
      expect(updatedTicket?.description).toBe('Updated Description');
    });

    it('should return 404 when ticket does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/v1/tickets/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Updated',
        })
        .expect(404);
    });

    it('should return 409 when trying to update closed ticket', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Closed Ticket',
        description: 'Test',
        userId: customerId,
        status: 'closed',
      });

      await request(app.getHttpServer())
        .patch(`/v1/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Updated',
        })
        .expect(409);
    });
  });

  describe('PATCH /v1/tickets/:id/status', () => {
    it('should return 403 when user lacks update permission', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Status Test',
        description: 'Test',
        userId: customerId,
        status: 'open',
      });

      await request(app.getHttpServer())
        .patch(`/v1/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'closed',
        })
        .expect(403);
    });

    it('should update ticket status to closed', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Status Test',
        description: 'Test',
        userId: customerId,
        status: 'open',
      });

      await request(app.getHttpServer())
        .patch(`/v1/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'closed',
        })
        .expect(200);

      // Verify status update using repository
      const updatedTicket = await ticketsRepository.findById(
        databaseService.db,
        ticket.id,
      );

      expect(updatedTicket?.status).toBe('closed');
    });

    it('should return 409 when status is already set', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Already Closed',
        description: 'Test',
        userId: customerId,
      });

      await request(app.getHttpServer())
        .patch(`/v1/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'open',
        })
        .expect(409);
    });

    it('should return 400 when invalid status', async () => {
      const ticket = await ticketsRepository.create(databaseService.db, {
        title: 'Invalid Status',
        description: 'Test',
        userId: customerId,
        status: 'open',
      });

      await request(app.getHttpServer())
        .patch(`/v1/tickets/${ticket.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'invalid',
        })
        .expect(400);
    });
  });
});
