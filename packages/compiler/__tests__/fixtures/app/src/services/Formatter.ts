/** Not decorated, so `tic build` leaves it out of the generated module. */
export class Formatter {
  format(name: string): string {
    return `Hello, ${name}!`;
  }
}
