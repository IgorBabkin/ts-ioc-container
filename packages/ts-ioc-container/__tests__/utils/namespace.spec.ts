import { joinNamespace, matchNamespace, normalizeNamespace } from '../../lib';

describe('namespace', () => {
  it('should normalize a module path into a namespace', () => {
    expect(normalizeNamespace('/app/src/domain/user/')).toBe('/app/src/domain/user');
    expect(normalizeNamespace('C:\\app\\domain')).toBe('/C:/app/domain');
    expect(normalizeNamespace('')).toBe('/');
  });

  it('should compose a namespace name out of a module path and a key', () => {
    expect(joinNamespace('/app/src/domain/user', 'ILogger')).toBe('/app/src/domain/user/ILogger');
    expect(joinNamespace('/app/src/domain/user', Symbol('ILogger'))).toBe('/app/src/domain/user/Symbol(ILogger)');
  });

  it('should match a template against the end of the namespace name', () => {
    // The absolute prefix `__dirname` brings does not have to be spelled out
    expect(matchNamespace('/domain/**', '/app/src/domain/user/ILogger')).toBe(true);
    expect(matchNamespace('/domain/*', '/app/src/domain/ILogger')).toBe(true);
    expect(matchNamespace('/domain/**', '/app/src/infra/ILogger')).toBe(false);
  });

  it('should not let `*` cross a directory boundary', () => {
    expect(matchNamespace('/domain/*', '/app/domain/user/ILogger')).toBe(false);
    expect(matchNamespace('/domain/**', '/app/domain/user/ILogger')).toBe(true);
  });

  it('should match by key as well as by directory', () => {
    expect(matchNamespace('**/ILogger', '/app/domain/user/ILogger')).toBe(true);
    expect(matchNamespace('/domain/*/ILogger', '/app/domain/user/ILogger')).toBe(true);
    expect(matchNamespace('**/ILogger', '/app/domain/user/IRepository')).toBe(false);
  });

  it('should match everything when the template is empty', () => {
    expect(matchNamespace('', '/app/domain/user/ILogger')).toBe(true);
  });
});
