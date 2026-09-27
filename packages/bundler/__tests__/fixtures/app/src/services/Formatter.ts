/** Not decorated, so `tic build` leaves it out of the bundle. */
export class Formatter {
  format(name: string): string {
    return `Hello, ${name}!`;
  }
}
