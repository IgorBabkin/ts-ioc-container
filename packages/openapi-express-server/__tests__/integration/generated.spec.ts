import 'reflect-metadata';
import { renderComponents, renderServer } from '@ibabkin/openapi-to-server';
import { renderValidators } from '@ibabkin/openapi-to-zod';
import * as path from 'path';
import * as fs from 'fs';
import request from 'supertest';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { Container, Registration } from 'ts-ioc-container';
import { RouteBuilder } from '../RouteBuilder';
import { read } from 'yaml-import';
import { OpenAPIV3 } from 'openapi-types';

const API_SPEC = path.resolve(__dirname, './api.yaml');
const GENERATED_TYPES = path.resolve(__dirname, './generated-types.ts');
const GENERATED_VALIDATORS = path.resolve(__dirname, './generated-validators.ts');

describe('Generated Types Integration Test', () => {
  beforeAll(() => {
    // Load OpenAPI document
    const doc = read(API_SPEC) as OpenAPIV3.Document;

    // Generate TypeScript types
    const components = renderComponents(doc);
    const server = renderServer(doc);
    fs.writeFileSync(GENERATED_TYPES, components + server);

    // Generate Zod validators
    const validators = renderValidators(doc);
    fs.writeFileSync(GENERATED_VALIDATORS, validators);

    // Verify files were generated
    expect(fs.existsSync(GENERATED_TYPES)).toBe(true);
    expect(fs.existsSync(GENERATED_VALIDATORS)).toBe(true);
  });

  it('should generate TypeScript types', () => {
    const content = fs.readFileSync(GENERATED_TYPES, 'utf-8');

    // Check for type definitions
    expect(content).toContain('export type User');
    expect(content).toContain('export type CreateUserRequest');
    expect(content).toContain('export type UpdateUserRequest');

    // Check for payload types
    expect(content).toContain('export type GetUsersPayload');
    expect(content).toContain('export type CreateUserPayload');
    expect(content).toContain('export type GetUserPayload');
    expect(content).toContain('export type UpdateUserPayload');
    expect(content).toContain('export type DeleteUserPayload');

    // Check for response types
    expect(content).toContain('export interface GetUsersResponse');
    expect(content).toContain('export interface CreateUserResponse');
    expect(content).toContain('export interface GetUserResponse');
    expect(content).toContain('export interface UpdateUserResponse');
    expect(content).toContain('export interface DeleteUserResponse');

    // Check for use case interfaces
    expect(content).toContain('export interface GetUsersUseCase extends UseCase<GetUsersPayload, GetUsersResponse>');
    expect(content).toContain(
      'export interface CreateUserUseCase extends UseCase<CreateUserPayload, CreateUserResponse>',
    );
    expect(content).toContain('export interface GetUserUseCase extends UseCase<GetUserPayload, GetUserResponse>');
    expect(content).toContain(
      'export interface UpdateUserUseCase extends UseCase<UpdateUserPayload, UpdateUserResponse>',
    );
    expect(content).toContain(
      'export interface DeleteUserUseCase extends UseCase<DeleteUserPayload, DeleteUserResponse>',
    );

    // Check for IServer interface
    expect(content).toContain('export interface IServer');
    expect(content).toContain('getUsers: constructor<GetUsersUseCase>');
    expect(content).toContain('deleteUser: constructor<DeleteUserUseCase>');
  });

  it('should generate Zod validators', () => {
    const content = fs.readFileSync(GENERATED_VALIDATORS, 'utf-8');

    // Check for schema exports
    expect(content).toContain('export const User =');
    expect(content).toContain('export const CreateUserRequest =');
    expect(content).toContain('export const UpdateUserRequest =');

    // Check for payload validators map keyed by operationId
    expect(content).toContain('export const PAYLOADS =');
    for (const operationId of ['getUsers', 'createUser', 'getUser', 'updateUser', 'deleteUser']) {
      expect(content).toContain(`${operationId}: z.object(`);
    }
  });

  afterAll(() => {
    // Clean up generated files
    if (fs.existsSync(GENERATED_TYPES)) {
      fs.unlinkSync(GENERATED_TYPES);
    }
    if (fs.existsSync(GENERATED_VALIDATORS)) {
      fs.unlinkSync(GENERATED_VALIDATORS);
    }
  });
});

// In-memory user store for testing
const users = new Map<string, any>([
  [
    '123e4567-e89b-12d3-a456-426614174000',
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john@example.com',
      name: 'John Doe',
      role: 'admin',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    },
  ],
  [
    '223e4567-e89b-12d3-a456-426614174001',
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'user',
      createdAt: new Date('2024-01-02T00:00:00Z'),
    },
  ],
]);

let nextId = 3;

// One use case per operation, each implementing the generated `<Op>UseCase`
class GetUsersUseCase {
  async handle(payload: any) {
    let filteredUsers = Array.from(users.values());

    if (payload.query?.role) {
      filteredUsers = filteredUsers.filter((u: any) => u.role === payload.query.role);
    }

    const page = payload.query?.page || 1;
    const limit = payload.query?.limit || 10;
    const start = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(start, start + limit);

    return {
      status: 200,
      headers: {},
      body: {
        users: paginatedUsers,
        total: filteredUsers.length,
      },
    };
  }
}

class CreateUserUseCase {
  async handle(payload: any) {
    const id = `${nextId++}23e4567-e89b-12d3-a456-42661417400${nextId}`;
    const user = {
      id,
      email: payload.body.email,
      name: payload.body.name,
      role: payload.body.role,
      createdAt: new Date(),
    };

    users.set(id, user);

    return {
      status: 201,
      headers: {
        Location: `/users/${id}`,
      },
      body: user,
    };
  }
}

class GetUserUseCase {
  async handle(payload: any) {
    const user = users.get(payload.params.id);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      status: 200,
      headers: {},
      body: user,
    };
  }
}

class UpdateUserUseCase {
  async handle(payload: any) {
    const user = users.get(payload.params.id);

    if (!user) {
      throw new Error('User not found');
    }

    const updated = {
      ...user,
      ...(payload.body.email && { email: payload.body.email }),
      ...(payload.body.name && { name: payload.body.name }),
      ...(payload.body.role && { role: payload.body.role }),
    };

    users.set(payload.params.id, updated);

    return {
      status: 200,
      headers: {},
      body: updated,
    };
  }
}

class DeleteUserUseCase {
  async handle(payload: any) {
    const deleted = users.delete(payload.params.id);

    if (!deleted) {
      throw new Error('User not found');
    }

    return {
      status: 204,
      headers: {},
    };
  }
}

describe('Integration Test with Generated Types and Validators', () => {
  let app: Express;
  let validatorsModule: any;

  beforeAll(async () => {
    // Load OpenAPI document
    const doc = read(API_SPEC) as OpenAPIV3.Document;

    // Generate TypeScript types
    const components = renderComponents(doc);
    const server = renderServer(doc);
    fs.writeFileSync(GENERATED_TYPES, components + server);

    // Generate Zod validators
    const validatorsCode = renderValidators(doc);
    fs.writeFileSync(GENERATED_VALIDATORS, validatorsCode);

    // Dynamically import generated validators
    validatorsModule = await import('./generated-validators' as any);

    const container = new Container({ tags: ['application'] });
    container.addRegistration(Registration.fromClass(GetUsersUseCase).bindToKey('getUsers'));
    container.addRegistration(Registration.fromClass(CreateUserUseCase).bindToKey('createUser'));
    container.addRegistration(Registration.fromClass(GetUserUseCase).bindToKey('getUser'));
    container.addRegistration(Registration.fromClass(UpdateUserUseCase).bindToKey('updateUser'));
    container.addRegistration(Registration.fromClass(DeleteUserUseCase).bindToKey('deleteUser'));

    const routeBuilder = new RouteBuilder(container, doc, validatorsModule.PAYLOADS);

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    routeBuilder.applyTo(app);

    app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        return next(error);
      }
      res.status(error instanceof ZodError ? 400 : 500).json({ error: error.message });
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const response = await request(app).get('/users').expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.total).toBe(2);
    });

    it('should filter users by role', async () => {
      const response = await request(app).get('/users?role=admin').expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].role).toBe('admin');
    });

    it('should paginate results', async () => {
      const response = await request(app).get('/users?page=1&limit=1').expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.total).toBe(2);
    });

    it('should validate query parameters', async () => {
      const response = await request(app).get('/users?limit=invalid').expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'bob@example.com',
        name: 'Bob Wilson',
        role: 'user',
      };

      const response = await request(app).post('/users').send(newUser).expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.name).toBe(newUser.name);
      expect(response.body.role).toBe(newUser.role);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.headers.location).toMatch(/^\/users\/.+$/);
    });

    it('should validate request body', async () => {
      const invalidUser = {
        email: 'invalid-email',
        name: 'B',
        role: 'invalid-role',
      };

      const response = await request(app).post('/users').send(invalidUser).expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should require all required fields', async () => {
      const incompleteUser = {
        email: 'test@example.com',
      };

      const response = await request(app).post('/users').send(incompleteUser).expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /users/:id', () => {
    it('should return a specific user', async () => {
      const response = await request(app).get('/users/123e4567-e89b-12d3-a456-426614174000').expect(200);

      expect(response.body.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(response.body.email).toBe('john@example.com');
    });

    it('should return 500 for non-existent user', async () => {
      const response = await request(app).get('/users/999e4567-e89b-12d3-a456-426614174999').expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user', async () => {
      const updates = {
        name: 'John Updated',
        role: 'user',
      };

      const response = await request(app).put('/users/123e4567-e89b-12d3-a456-426614174000').send(updates).expect(200);

      expect(response.body.name).toBe('John Updated');
      expect(response.body.role).toBe('user');
      expect(response.body.email).toBe('john@example.com'); // Unchanged
    });

    it('should validate update data', async () => {
      const invalidUpdates = {
        email: 'not-an-email',
        name: 'X',
      };

      const response = await request(app)
        .put('/users/123e4567-e89b-12d3-a456-426614174000')
        .send(invalidUpdates)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      await request(app).delete('/users/223e4567-e89b-12d3-a456-426614174001').expect(204);

      // Verify user is deleted
      await request(app).get('/users/223e4567-e89b-12d3-a456-426614174001').expect(500);
    });
  });

  afterAll(() => {
    // Clean up generated files
    if (fs.existsSync(GENERATED_TYPES)) {
      fs.unlinkSync(GENERATED_TYPES);
    }
    if (fs.existsSync(GENERATED_VALIDATORS)) {
      fs.unlinkSync(GENERATED_VALIDATORS);
    }
  });
});
