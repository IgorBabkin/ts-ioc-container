import { Request } from 'express';

export interface Payload {
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, any>;
}

export function buildPayload(req: Request): Payload {
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
