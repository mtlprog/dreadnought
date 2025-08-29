# MTL Crowd - Crowdfunding Platform

Децентрализованная краудфандинговая платформа на базе блокчейна Stellar.

## Environment Variables

Для работы приложения необходимо настроить следующие переменные окружения:

```bash
# Stellar Configuration
STELLAR_ACCOUNT_ID=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Публичный ключ Stellar аккаунта
STELLAR_NETWORK=testnet  # testnet или mainnet
```

### Описание переменных:

- **STELLAR_ACCOUNT_ID**: Публичный ключ Stellar аккаунта, который содержит данные проектов в manageData записях
- **STELLAR_NETWORK**: Сеть Stellar (testnet для разработки, mainnet для продакшена)

## Архитектура данных

### Проекты в Stellar

1. **Метаданные проекта**: Хранятся в IPFS, ссылка в manageData аккаунта с ключом `ipfshash-{CODE}`
2. **Токены проекта**: Создаются с кодом `{CODE}`, должны существовать в claimable balance или на аккаунте проекта
3. **Собранные средства**: Токены с кодом `C-{CODE}` в claimable balance основного аккаунта
4. **Поддержавшие**: Уникальные создатели claimable balance с токенами `C-{CODE}`

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

**Примечание**: CLI требует дополнительную переменную `STELLAR_SEED` для подписи транзакций.