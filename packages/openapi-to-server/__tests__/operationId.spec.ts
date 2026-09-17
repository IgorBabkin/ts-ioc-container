import { OpenAPIV3 } from 'openapi-types';
import { renderClient, renderComponents, renderControllers, toIdentifier } from '../lib';

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
    expect(components).toContain(`export interface ${capitalized}Route extends Route<`);
  });

  // OP-1 — the same string keys the maps, names the controller method and names the client method.
  it('uses the operationId verbatim as a key and as a method name', () => {
    const doc = specWithOperationIds('get_user');

    expect(renderComponents(doc)).toContain('get_user: Get_userRoute;');
    expect(renderComponents(doc)).toContain('get_user: Get_userPayload;');
    expect(renderControllers(doc)).toContain('get_user(payload: Get_userPayload): Promise<Get_userResponse>;');
    expect(renderClient(doc)).toContain('async get_user(data: Get_userPayload): Promise<Get_userResponse>');
  });

  // OP-3 — contrast with CN-3: a tag is normalised, an operationId is not.
  it('does not normalise the operationId', () => {
    const components = renderComponents(specWithOperationIds('2fa'));

    expect(toIdentifier('2fa')).toBe('_2fa');
    expect(components).toContain('export type 2faPayload = {');
    expect(components).not.toContain('_2faPayload');
  });

  // OP-4 — ids key flat maps, so a duplicate is emitted twice rather than merged or rejected.
  it('emits a duplicated operationId twice instead of merging it', () => {
    const components = renderComponents(specWithOperationIds('dup', 'dup'));

    expect(components.match(/export type DupPayload = \{/g)).toHaveLength(2);
    expect(components.match(/^ {2}dup: DupRoute;$/gm)).toHaveLength(2);
  });
});
