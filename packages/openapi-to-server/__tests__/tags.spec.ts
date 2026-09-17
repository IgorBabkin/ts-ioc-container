import { OpenAPIV3 } from 'openapi-types';
import { renderControllers, renderServer, toIdentifier } from '../lib';

function specWithTags(...tags: (string[] | undefined)[]): OpenAPIV3.Document {
  const paths: OpenAPIV3.PathsObject = {};

  tags.forEach((operationTags, index) => {
    paths[`/resource-${index}`] = {
      get: {
        operationId: `getResource${index}`,
        ...(operationTags ? { tags: operationTags } : {}),
        responses: { '200': { description: 'ok' } },
      },
    };
  });

  return { openapi: '3.0.0', info: { title: 'tags', version: '1.0.0' }, paths };
}

describe('SPEC-001 · toIdentifier', () => {
  // CN-3
  it.each([
    ['items', 'Items'],
    ['Items', 'Items'],
    ['Network Health', 'Network'],
    ['station-groups', 'Station'],
    ['v1/admin', 'V1'],
    ['user_profile', 'User_profile'],
    ['  padded  tag  ', 'Padded'],
  ])('converts %p into %p', (tag, expected) => {
    expect(toIdentifier(tag)).toBe(expected);
  });

  // CN-4
  it('prefixes an identifier that would start with a digit', () => {
    expect(toIdentifier('2fa')).toBe('_2fa');
  });

  // CN-4
  it('falls back to _ when nothing usable is left', () => {
    expect(toIdentifier('///')).toBe('_');
  });

  // CN-5
  it('is idempotent', () => {
    expect(toIdentifier(toIdentifier('Network Health'))).toBe('Network');
    expect(toIdentifier(toIdentifier('2fa'))).toBe('_2fa');
  });
});

describe('SPEC-001 · controller naming', () => {
  // CN-6
  it('sanitises the controller interface name', () => {
    const controllers = renderControllers(specWithTags(['Network Health']));

    expect(controllers).toContain('export interface INetworkController');
    expect(controllers).not.toContain('INetwork HealthController');
  });

  // CN-6
  it('sanitises the IServer key', () => {
    const server = renderServer(specWithTags(['Network Health']));

    expect(server).toContain('Network: constructor<INetworkController>');
    expect(server).not.toContain('Network Health:');
  });

  // CN-1
  it('groups by the first tag only', () => {
    const doc = specWithTags(['Network Health', 'Diagnostics']);

    expect(renderServer(doc)).toContain('Network: constructor<INetworkController>');
    expect(renderServer(doc)).not.toContain('Diagnostics');
    expect(renderControllers(doc)).not.toContain('IDiagnosticsController');
  });

  // CN-2
  it('falls back to the Default controller when an operation has no tags', () => {
    const doc = specWithTags(undefined);

    expect(renderControllers(doc)).toContain('export interface IDefaultController');
    expect(renderServer(doc)).toContain('Default: constructor<IDefaultController>');
  });

  // CN-8 — truncation is lossy, so `Network Health` and `network-status` share one controller
  // rather than emitting the same interface name twice.
  it('merges tags that normalise to the same identifier into one controller', () => {
    const doc = specWithTags(['Network Health'], ['network-status']);

    const controllers = renderControllers(doc);
    const server = renderServer(doc);

    expect(controllers.match(/export interface INetworkController/g)).toHaveLength(1);
    expect(controllers).toContain('getResource0(payload: GetResource0Payload)');
    expect(controllers).toContain('getResource1(payload: GetResource1Payload)');
    expect(server.match(/Network: constructor/g)).toHaveLength(1);
  });
});
