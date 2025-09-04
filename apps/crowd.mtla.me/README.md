# MTL Crowd - Crowdfunding Platform

Децентрализованная краудфандинговая платформа на базе блокчейна Stellar.

## Environment Variables

Для работы приложения необходимо настроить следующие переменные окружения:

```bash
# Stellar Configuration
STELLAR_ACCOUNT_ID=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Публичный ключ Stellar аккаунта
STELLAR_NETWORK=testnet  # testnet или mainnet
STELLAR_COMM_ACCOUNT_ID=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Аккаунт для получения комиссий
STELLAR_CROWD_TOKEN=MTLCROWD:GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Токен MTLCrowd (опционально)
```

### Описание переменных:

- **STELLAR_ACCOUNT_ID**: Публичный ключ Stellar аккаунта, который содержит данные проектов в manageData записях
- **STELLAR_NETWORK**: Сеть Stellar (testnet для разработки, mainnet для продакшена)
- **STELLAR_COMM_ACCOUNT_ID**: Публичный ключ аккаунта Programmers Guild DAO для получения комиссий (обязательно)
- **STELLAR_CROWD_TOKEN**: Токен MTLCrowd в формате CODE:ISSUER (опционально, если не указан - будет использован XLM)

### Настройка переменных окружения:

Создайте файл `.env.local` в корне проекта и укажите ваши значения:

```bash
cp .env.example .env.local
# Отредактируйте .env.local с вашими реальными значениями
```

Или установите переменные окружения в системе:

```bash
export STELLAR_ACCOUNT_ID="ваш_stellar_account_id"
export STELLAR_COMM_ACCOUNT_ID="ваш_commission_account_id"
export STELLAR_NETWORK="testnet"
```

## Архитектура данных

### Проекты в Stellar

1. **Метаданные проекта**: Хранятся в IPFS, ссылка в manageData аккаунта с ключом `ipfshash-{CODE}`
2. **Токены проекта**: Создаются с кодом `P{CODE}` (префикс P), должны существовать в claimable balance или на аккаунте проекта
3. **Токены краудфандинга**: Создаются с кодом `C{CODE}` (префикс C), выставляются на продажу за MTLCrowd по курсу 1:1
4. **Ордера на продажу**: Автоматически создаются ордера на продажу C-токенов за MTLCrowd на запрашиваемую сумму
5. **Поддержавшие**: Участники покупают C-токены за MTLCrowd через DEX Stellar

### Статусы проектов

- **active**: Дедлайн не истек, проект активен
- **completed**: Дедлайн истек, показывается как "FUNDING ENDED"

## Кэширование

Данные проектов кэшируются на 5 минут для оптимизации производительности.

## CLI

Для управления проектами через CLI используйте:

```bash
bun run cli project new    # Создать новый проект
bun run cli project list   # Показать список проектов
```
