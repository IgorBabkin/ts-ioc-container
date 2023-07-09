import { getFilenameWithoutPath, getPathToFileWithoutFileName } from '../lib/utils/file';

describe('file', function () {
  it('getFilename should return filename without path', function () {
    expect(getFilenameWithoutPath('/a/b/c.js')).toEqual('c.js');
  });

  it('getPath should return path to file without filename', function () {
    expect(getPathToFileWithoutFileName('/a/b/c.js')).toEqual('/a/b');
  });
});
