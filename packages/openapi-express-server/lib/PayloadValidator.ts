import { Request } from 'express';
import { ZodObject } from 'zod';

export interface Payload {
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, any>;
}

export class PayloadValidator {
  constructor(private readonly payload: Record<string, ZodObject>) {}

  parseByOperationId(operationId: string, req: Request): unknown {
    const validator = this.payload[operationId];
    if (validator === undefined) {
      throw new Error(`Cannot find validator for operationId = ${operationId}`);
    }

    const payload = this.buildPayload(req);
    return validator.parse(payload);
  }

  private buildPayload(req: Request): Payload {
    const payload: Payload = {};

    if (req.params && Object.keys(req.params).length > 0) {
      payload.params = req.params;
    }

    if (req.query && Object.keys(req.query).length > 0) {
      payload.query = req.query as Record<string, any>;
    }

    if (req.body !== undefined && req.body !== null) {
      payload.body = req.body;
    }

    if (req.headers && Object.keys(req.headers).length > 0) {
      payload.headers = req.headers as Record<string, any>;
    }

    return payload;
  }
}
