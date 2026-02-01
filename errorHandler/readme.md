It contains implementation of server-error-handler patter in express and fastify.

# Consume

```typescript
@register(bindTo(toGroupAlias('IErrorHandler')), singleton())
export class EntityNotFoundErrorHandler implements IErrorHandler {
    constructor(@inject(ISomeServiceKey) private someService: ISomeService)

    priority = 1;

    match(error: unknown): Boolean {
        return error instanceof EntityNotFoundError;
    }

    handle(error: EntityNotFoundError, {req,reply}: ExpressContext) {
        // some logic
        reply.header(400);
        reply.send('Entity Not Found')
    }
}

container.addRegistation(R.fromClass(EntityNotFoundErrorHandler))
const app = express();
app.use(errorHandler(container)) // usage
```

So inside of errorHandler plugin it should add error handling logic which injects error handlers from container and use them to handle.

Expose: errorHandler, IErrorHandler