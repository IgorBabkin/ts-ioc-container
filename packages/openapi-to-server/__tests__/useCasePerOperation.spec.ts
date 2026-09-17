import { OpenAPIV3 } from 'openapi-types';
import { openapiToServer, renderComponents, renderServer } from '../lib';
import fs from 'fs';
import * as path from 'path';

type Op = { operationId: string; tags?: string[]; summary?: string };

function specWith(...ops: Op[]): OpenAPIV3.Document {
  const paths: OpenAPIV3.PathsObject = {};

  ops.forEach(({ operationId, tags, summary }, index) => {
    paths[`/resource-${index}`] = {
      get: {
        operationId,
        ...(tags ? { tags } : {}),
        ...(summary ? { summary } : {}),
        responses: { '200': { description: 'ok' } },
      },
    };
  });

  return { openapi: '3.0.0', info: { title: 'use cases', version: '1.0.0' }, paths };
}

describe('SPEC-007 · use case per operation', () => {
  // UC-2 — named from the operationId, extends the runtime UseCase with the operation's own types.
  it.each([
    ['getUser', 'GetUser'],
    ['get_user', 'Get_user'],
    ['GETUser', 'GETUser'],
  ])('renders %p as %pUseCase', (operationId, capitalized) => {
    const components = renderComponents(specWith({ operationId, tags: ['users'] }));

    expect(components).toContain(
      `export interface ${capitalized}UseCase extends UseCase<${capitalized}Payload, ${capitalized}Response> {}`,
    );
    expect(components).toContain('import { UseCase, HttpResponse, HttpStatus, constructor }');
    expect(components).not.toContain('Route<');
  });

  // UC-3 — IServer and Operations are keyed by the operationId verbatim.
  it('keys IServer and Operations by the operationId', () => {
    const doc = specWith({ operationId: 'get_user', tags: ['users'] });

    expect(renderServer(doc)).toContain('get_user: constructor<Get_userUseCase>;');
    expect(renderComponents(doc)).toContain('get_user: Get_userUseCase;');
  });

  // UC-1 — the tag groups nothing: two operations sharing a tag are two use cases and two
  // IServer entries, and a tag never appears as a name or a key.
  it('gives every operation its own use case whatever its tags', () => {
    const doc = specWith(
      { operationId: 'getHealth', tags: ['Network Health'] },
      { operationId: 'getStatus', tags: ['Network Health'] },
      { operationId: 'getNodes', tags: ['network-status', 'Network Health'] },
    );
    const components = renderComponents(doc);
    const server = renderServer(doc);

    for (const name of ['GetHealth', 'GetStatus', 'GetNodes']) {
      expect(components.match(new RegExp(`export interface ${name}UseCase `, 'g'))).toHaveLength(1);
    }
    expect(server.match(/constructor</g)).toHaveLength(3);
    expect(server).not.toContain('Network');
    expect(components).not.toContain('Controller');
    expect(server).not.toContain('Controller');
  });

  // UC-5 — an untagged operation is a use case like any other; no `Default` is invented.
  it('does not treat an untagged operation differently', () => {
    const doc = specWith({ operationId: 'ping' });

    expect(renderComponents(doc)).toContain('export interface PingUseCase extends UseCase<PingPayload, PingResponse>');
    expect(renderServer(doc)).toContain('ping: constructor<PingUseCase>;');
    expect(renderServer(doc)).not.toContain('Default');
  });

  // UC-2 — the operation's summary and tags are carried into the doc comment, so an implementer
  // sees which domain the use case belongs to without opening the document.
  it('documents the use case with the operation summary and tags', () => {
    const components = renderComponents(
      specWith({ operationId: 'getUser', tags: ['users', 'admin'], summary: 'Fetch a user' }),
    );

    expect(components).toContain('* Fetch a user');
    expect(components).toContain('* @tags users, admin');
  });

  // UC-7 — the file the CLI writes is the components followed by IServer, nothing else.
  it('writes components and IServer as the whole server contract', () => {
    const inputFile = path.resolve(__dirname, './swagger.yaml');
    const outputFile = path.resolve(__dirname, '../.generated/use-cases/contract/operations.ts');
    fs.rmSync(path.dirname(outputFile), { recursive: true, force: true });

    openapiToServer({ inputFile, outputFile });

    const output = fs.readFileSync(outputFile, 'utf8');
    expect(output).toContain('export interface GetItemsUseCase extends UseCase<GetItemsPayload, GetItemsResponse>');
    expect(output).toContain('export interface IServer {');
    expect(output).toContain('getItems: constructor<GetItemsUseCase>;');
    expect(output).not.toContain('Controller');
    expect(output.indexOf('export interface IServer')).toBeGreaterThan(output.indexOf('export type Operations'));
  });
});
