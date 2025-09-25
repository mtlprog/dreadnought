# Stellar Token Price CLI

CLI утилита для вычисления стоимости токенов Stellar относительно друг друга на основе данных orderbook.

## Установка

```bash
cd apps/stat.mtlf.me
bun install
```

## Использование

### Получение цены токена относительно другого токена

```bash
bun run cli price -a <TOKEN_A_CODE> --token-a-issuer <TOKEN_A_ISSUER> -b <TOKEN_B_CODE> --token-b-issuer <TOKEN_B_ISSUER>
```

#### Пример: XLM / USDC
```bash
STELLAR_NETWORK=mainnet bun run cli price -a XLM --token-a-issuer native -b USDC --token-b-issuer GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
```

#### Пример: MTL / EURMTL
```bash
STELLAR_NETWORK=mainnet bun run cli price -a MTL --token-a-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V -b EURMTL --token-b-issuer GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V
```

### Предустановленные команды

#### XLM/USDC (Mainnet)
```bash
STELLAR_NETWORK=mainnet bun run cli xlm-usdc
```

#### MTL/EURMTL (Mainnet)
```bash
STELLAR_NETWORK=mainnet bun run cli mtl-eurmtl
```

## Переменные окружения

- `STELLAR_NETWORK`: Сеть Stellar (`mainnet` или `testnet`, по умолчанию `testnet`)

## Как это работает

1. CLI подключается к Horizon серверу Stellar
2. Получает данные orderbook для указанной пары токенов
3. Анализирует bid/ask ордера (первые 10 в каждом направлении)
4. Вычисляет средневзвешенную цену на основе объемов
5. Выводит результат с временной меткой

## Особенности

- Использует Effect-TS для обработки эффектов и ошибок
- Поддерживает как native токены (XLM), так и custom assets
- Красивый вывод с цветовой подсветкой
- Обработка ошибок сети и отсутствия данных