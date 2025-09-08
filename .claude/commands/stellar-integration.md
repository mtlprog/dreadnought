Интеграция с Stellar blockchain.

```markdown
Implement Stellar integration: $ARGUMENTS

Create Stellar blockchain integration:

1. Use @stellar/stellar-sdk v11+
2. Wrap ALL Stellar operations in Effect:
```typescript
   Effect.tryPromise({
     try: () => stellarOperation(),
     catch: (error) => new NetworkError({ cause: error })
   })
```

3. Implement wallet connection with @stellar/wallets-kit
4. Support multiple wallets (Freighter, Albedo, xBull)
5. Use branded types for PublicKey and amounts
6. Handle network errors with retry logic
7. Always simulate Soroban transactions first

Network configs:

- Testnet for development
- Mainnet for production
- Use Effect Context for configuration

Test with testnet first, document all transaction types.
