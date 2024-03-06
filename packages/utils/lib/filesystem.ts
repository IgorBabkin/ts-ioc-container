import path from 'path';
import * as fs from 'fs';

export function getAllFilenames(directory: string) {
  const filenames: string[] = [];

  function getFilenamesRecursively(dir: string) {
    const files = fs.readdirSync(dir);

    files.forEach((file: string) => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getFilenamesRecursively(filePath);
      } else {
        filenames.push(filePath);
      }
    });
  }

  getFilenamesRecursively(directory);

  return filenames;
}
