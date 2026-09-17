import { OpenAPIV3 } from 'openapi-types';
import { renderClient, renderComponents, renderServer } from '../lib';

function specWithOperationIds(...operationIds: string[]): OpenAPIV3.Document {
  const paths: OpenAPIV3.PathsObject = {};

  operationIds.forEach((operationId, index) => {
    paths[`/resource-${index}`] = {
      get: {
        operationId,
        tags: ['items'],
        responses: { '200': { description: 'ok' } },
      },
    };
  });

  return { openapi: '3.0.0', info: { title: 'operations', version: '1.0.0' }, paths };
}

describe('SPEC-002 · operationId naming', () => {
  // OP-2 — only the first character is upper-cased, the rest is carried through untouched.
  it.each([
    ['getUser', 'GetUser'],
    ['get_user', 'Get_user'],
    ['GETUser', 'GETUser'],
    ['getuser', 'Getuser'],
  ])('derives the type names of %p from %p', (operationId, capitalized) => {
    const components = renderComponents(specWithOperationIds(operationId));

    expect(components).toContain(`export type ${capitalized}Payload = {`);
    expect(components).toContain(`export interface ${capitalized}Response extends HttpResponse`);
    expect(components).toContain(`export interface ${capitalized}UseCase extends UseCase<`);
  });

  // OP-1 — the same string keys the maps, IServer and the client method.
  it('uses the operationId verbatim as a key and as a method name', () => {
    const doc = specWithOperationIds('get_user');

    expect(renderComponents(doc)).toContain('get_user: Get_userUseCase;');
    expect(renderComponents(doc)).toContain('get_user: Get_userPayload;');
    expect(renderServer(doc)).toContain('get_user: constructor<Get_userUseCase>;');
    expect(renderClient(doc)).toContain('async get_user(data: Get_userPayload): Promise<Get_userResponse>');
  });

  // OP-3 — an operationId is not normalised, so an invalid one is emitted as is.
  it('does not normalise the operationId', () => {
    const components = renderComponents(specWithOperationIds('2fa'));

    expect(components).toContain('export type 2faPayload = {');
    expect(components).toContain('export interface 2faUseCase extends UseCase<2faPayload, 2faResponse>');
    expect(components).not.toContain('_2fa');
  });

  // OP-4 — ids key flat maps, so a duplicate is emitted twice rather than merged or rejected.
  it('emits a duplicated operationId twice instead of merging it', () => {
    const components = renderComponents(specWithOperationIds('dup', 'dup'));

    expect(components.match(/export type DupPayload = \{/g)).toHaveLength(2);
    expect(components.match(/^ {2}dup: DupUseCase;$/gm)).toHaveLength(2);
  });
});
