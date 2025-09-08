Analyze and improve test coverage for: $ARGUMENTS

Test coverage analysis:

1. Run coverage report: `bun test --coverage`
2. Identify untested code paths
3. Write tests for:
   - All Effect chains
   - Error scenarios (use Effect.flip)
   - Edge cases
   - Service layer implementations

Test template:
```typescript
import { describe, test, expect } from "bun:test"
import { Effect, Layer } from "effect"

describe("ServiceName", () => {
  const TestLayer = Layer.succeed(/* mocks */)
  const runtime = Runtime.make(TestLayer)
  
  test("success case", async () => {
    const result = await pipe(
      serviceMethod(),
      runtime.runPromise
    )
    expect(result).toBe(expected)
  })
  
  test("error case", async () => {
    const error = await pipe(
      serviceMethod(),
      Effect.flip,
      runtime.runPromise
    )
    expect(error._tag).toBe("ErrorTag")
  })
})
```

Aim for 80%+ coverage, 100% for critical paths.
