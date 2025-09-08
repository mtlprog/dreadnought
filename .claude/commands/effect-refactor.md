Refactor to Effect-TS: $ARGUMENTS

Convert async/Promise-based code to Effect patterns:

1. Identify all async operations
2. Replace with Effect equivalents:
   - async/await → Effect.gen or pipe
   - try/catch → Effect.tryPromise
   - Promise.all → Effect.all
   - throw → Effect.fail
   
3. Define typed errors using Schema:
   ```typescript
   export class ServiceError extends S.TaggedError<ServiceError>()(
     "ServiceError",
     { message: S.String, cause: S.optional(S.Unknown) }
   ) {}

4. Create service layers:
```typescript
typescriptexport const ServiceLive = Layer.succeed(Service, {
  method: (params) => pipe(...)
})
```

5. Update imports and tests

Remember: NO async/await anywhere in the codebase!
