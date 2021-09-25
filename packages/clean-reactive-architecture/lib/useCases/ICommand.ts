export interface ICommand {
  execute(...any: unknown[]): void | Promise<void>;
}
