import { createServer } from '../lib';
import { HttpStatus } from '@ibabkin/openapi-to-server-interface';
import * as path from 'path';

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
}

const todos: Map<string, Todo> = new Map([
  ['1', { id: '1', title: 'Learn OpenAPI', completed: false }],
  ['2', { id: '2', title: 'Build Express server', completed: true }],
]);

let nextId = 3;

class TodosController {
  async getTodos(payload: any) {
    let items = Array.from(todos.values());

    if (payload.query?.completed !== undefined) {
      const completed = payload.query.completed === 'true';
      items = items.filter((todo) => todo.completed === completed);
    }

    return {
      status: HttpStatus.OK,
      headers: {},
      body: items,
    };
  }

  async createTodo(payload: any) {
    const id = String(nextId++);
    const todo: Todo = {
      id,
      title: payload.body.title,
      description: payload.body.description,
      completed: false,
    };

    todos.set(id, todo);

    return {
      status: HttpStatus.Created,
      headers: {
        Location: `/todos/${id}`,
      },
      body: todo,
    };
  }

  async getTodo(payload: any) {
    const todo = todos.get(payload.params.id);

    if (!todo) {
      throw new Error('Todo not found');
    }

    return {
      status: HttpStatus.OK,
      headers: {},
      body: todo,
    };
  }

  async updateTodo(payload: any) {
    const todo = todos.get(payload.params.id);

    if (!todo) {
      throw new Error('Todo not found');
    }

    const updated: Todo = {
      ...todo,
      ...(payload.body.title && { title: payload.body.title }),
      ...(payload.body.description !== undefined && { description: payload.body.description }),
      ...(payload.body.completed !== undefined && { completed: payload.body.completed }),
    };

    todos.set(payload.params.id, updated);

    return {
      status: HttpStatus.OK,
      headers: {},
      body: updated,
    };
  }

  async deleteTodo(payload: any) {
    const deleted = todos.delete(payload.params.id);

    if (!deleted) {
      throw new Error('Todo not found');
    }

    return {
      status: HttpStatus.NoContent,
      headers: {},
    };
  }
}

const app = createServer({
  specPath: path.resolve(__dirname, './swagger.yaml'),
  server: {
    Todos: TodosController,
  },
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  GET    /todos');
  console.log('  POST   /todos');
  console.log('  GET    /todos/:id');
  console.log('  PUT    /todos/:id');
  console.log('  DELETE /todos/:id');
});
