import { glob, matchGlob } from '../../lib';

describe('glob', () => {
  it('should match a literal pattern against the whole path', () => {
    expect(matchGlob(glob('/domain/user/ILogger'), '/domain/user/ILogger')).toBe(true);
    expect(matchGlob(glob('/domain/user'), '/domain/user/ILogger')).toBe(false);
    expect(matchGlob(glob('/user/ILogger'), '/domain/user/ILogger')).toBe(false);
  });

  it('should match exactly one segment per `*`', () => {
    expect(matchGlob(glob('/domain/*/ILogger'), '/domain/user/ILogger')).toBe(true);
    expect(matchGlob(glob('/domain/*'), '/domain/user/ILogger')).toBe(false);
  });

  it('should match any number of segments per `**`', () => {
    expect(matchGlob(glob('/domain/**'), '/domain/user/nested/ILogger')).toBe(true);
    expect(matchGlob(glob('/domain/**'), '/domain/ILogger')).toBe(true);
    expect(matchGlob(glob('/domain/**/ILogger'), '/domain/ILogger')).toBe(true);
    expect(matchGlob(glob('**'), '/anything/at/all')).toBe(true);
  });

  it('should match a partial segment', () => {
    expect(matchGlob(glob('/domain/I*Token'), '/domain/ILoggerToken')).toBe(true);
    expect(matchGlob(glob('/domain/I*Token'), '/domain/LoggerToken')).toBe(false);
    // `*` never crosses a segment boundary, even in the middle of a segment
    expect(matchGlob(glob('/domain/I*Token'), '/domain/I/nested/Token')).toBe(false);
  });

  it('should treat `\\` as a separator on both sides', () => {
    expect(matchGlob(glob('\\domain\\**'), 'C:\\app\\domain\\user\\ILogger')).toBe(false);
    expect(matchGlob(glob('**\\domain\\**'), 'C:\\app\\domain\\user\\ILogger')).toBe(true);
  });

  it('should ignore repeated separators and `.` segments', () => {
    expect(matchGlob(glob('/domain/user'), '//domain///./user/')).toBe(true);
  });
});
