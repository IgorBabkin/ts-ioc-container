import * as fs from 'fs';

export function transpileFile(source: string, reducer: (text: string) => string, destination: string = source): void {
  if (!fs.existsSync(source)) {
    throw new Error(`File ${source} does not exist`);
  }
  const data = fs.readFileSync(source, 'utf-8');
  fs.writeFileSync(destination, reducer(data), 'utf-8');
}
