export interface BenchmarkSpec {
  prefix: string;
  name: string;
  description: string;
  taskName: string;
  createTask: () => () => void;
}
