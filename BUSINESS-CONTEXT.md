# BUSINESS-CONTEXT — Контекст для AI

> Этот файл содержит бизнес-логику и правила приложения. Используй его для анализа, рекомендаций и разработки новых фич. Не нужно заново изучать код — здесь есть всё необходимое для консультаций по развитию продукта.

---

## 1. Продукт

**bgt2** — бюджетное приложение для личного учёта финансов. Пользователи ведут счета, операции (доход/расход/перевод), категории, теги, повторяющиеся операции. Есть AI-загрузка чеков (фото, PDF), подписки с лимитами, экспорт в Excel.

**Стек:** NestJS 10, Apollo GraphQL 12, Prisma 6, PostgreSQL, Redis (сессии), RabbitMQ (email), Google Gemini (AI).

**Структура:** `apps/back/` — GraphQL API, `apps/rabbitmq-service/` — воркер email, `prisma/` — схема БД.

---

## 2. Глоссарий

| Термин | Описание |
|-------|----------|
| **Account (Счёт)** | Кошелёк/бюджет с балансом, валютой, иконкой. Уникальное имя в рамках userId. |
| **Operation (Операция)** | Доход (INCOME), расход (EXPENSE) или перевод (TRANSFER). Связана с account, category (кроме TRANSFER), tags. |
| **Category (Категория)** | Иерархическая классификация (parent/children). Тип: INCOME или EXPENSE. |
| **CategoryKeyword** | Фраза для авто-категоризации по описанию операции. Уникальная в рамках userId. |
| **Tag (Тег)** | Пользовательские метки для операций. Уникальное имя в рамках userId. |
| **RecurrenceConfig** | Шаблон повторяющейся операции (частота, интервал, сумма, категория). |
| **SubscriptionPlan** | План подписки с лимитами (операции, счета, категории и т.д.) и флагами (AI, экспорт, recurring). |
| **tokensBalance** | Баланс AI-токенов пользователя. Списывается при AI-загрузке, пополняется по плану. |

---

## 3. Модель данных (ключевое)

### Сущности и связи

- **User** → SubscriptionPlan (обязательно), Account[], Operation[], Category[], Tag[], RecurrenceConfig[]
- **Account** → User, Operation[] (account + transferOperations)
- **Operation** → Account, TransferAccount?, Category?, RecurrenceConfig?, Tag[]
- **Category** → User, parent?, children[], CategoryKeyword[]
- **RecurrenceConfig** → User, Account?, TransferAccount?, Category?, Operation[]

### Уникальность

- `(userId, name)` — Account, Tag, Category
- `(userId, phrase)` — CategoryKeyword

### Каскады

- Удаление User → каскад на Account, Operation, Category, Tag и т.д.
- Удаление Account/Category → каскад на Operation (Cascade), связанные операции удаляются.

---

## 4. Бизнес-правила

### Баланс счёта

| Тип операции | Изменение баланса |
|--------------|-------------------|
| INCOME | `balance += amount` |
| EXPENSE | `balance -= amount` |
| TRANSFER | source account: `balance -= amount`, target account: `balance += amount` |

**Важно:** Баланс обновляется только при **создании** операции. При update/delete баланс **не пересчитывается** — это текущее поведение (см. раздел «Ограничения»).

### Лимиты подписки (проверяются перед созданием)

| Ресурс | Поле плана | Где проверяется |
|--------|------------|-----------------|
| Операции в месяц | maxOperationsPerMonth | operation.service:59–77 |
| Счета | maxAccounts | account.service:26–38 |
| Категории | maxCategories | category.service:32–44 |
| Теги | maxTags | tag.service:26–38 |
| RecurrenceConfig | maxRecurrenceConfigs, canUseRecurring | recurrence.service:33–46 |
| CategoryKeyword (на категорию) | maxCategoryKeywordsPerCategory | subscription-limits.util.ts |

### Флаги плана (проверяются перед действием)

- **canUseAiOperations** — AI-загрузка файлов
- **canExportData** — экспорт в Excel
- **canUseRecurring** — повторяющиеся операции

### Валидации

- TRANSFER: `accountId !== transferAccountId` (нельзя переводить на тот же счёт)
- TRANSFER: categoryId не обязателен
- Category: parent может быть только корневой (parentId === null), тип родителя должен совпадать с типом дочерней
- Category: parentId !== self (SELF_PARENT запрещён)

---

## 5. Потоки

### Регистрация и вход

1. Регистрация → User + Token (EMAIL_VERIFY) → RabbitMQ → письмо с ссылкой
2. verifyAccount(token) → isEmailVerified=true → создание сессии в Redis
3. loginUser → проверка пароля → при TOTP проверка pin → сессия в Redis
4. Сессия: device (browser, OS, type), IP, location (geoip-lite)

### Создание операции

1. Проверка лимитов: maxOperationsPerMonth
2. Если `input.recurrence` → RecurrenceService.createRecurringOperation (создаётся RecurrenceConfig + первая операция)
3. Иначе: валидация account, category (для INCOME/EXPENSE), tags, transferAccount (для TRANSFER)
4. Создание Operation в транзакции + обновление balance счёта

### AI-загрузка

1. Проверка canUseAiOperations и tokensBalance
2. Подсчёт токенов (Gemini API)
3. Парсинг файла через Gemini
4. Авто-категоризация по CategoryKeyword (поиск фразы в description)
5. Списание actualTokens с tokensBalance
6. Запись AiTokenUsage
7. Возврат extracted operations (пользователь вызывает createExtractedOperations отдельно)

### Истечение подписки (cron 01:00)

1. User с subscriptionExpiresAt < now
2. План с isDefaultOnExpiration=true
3. Обновление: subscriptionPlanId, subscriptionExpiresAt=null, tokensBalance=tokensOnPurchase

### Пополнение токенов (cron 02:00)

1. Пользователи, у которых день месяца = EXTRACT(DAY, subscriptionStartedAt)
2. Планы с tokensPerMonth IS NOT NULL
3. tokensBalance = tokensPerMonth (полная замена, не инкремент)

### Recurrence (cron 00:01)

1. processRecurringOperations — для каждого RecurrenceConfig вычисляется следующая дата
2. Если nextDate <= today — создаётся операция, обновляется balance, nextDate пересчитывается
3. frequency: DAILY, WEEKLY (weekDays 0–6), MONTHLY, YEARLY

---

## 6. Cron-задачи

| Расписание | Задача | Действие |
|------------|--------|----------|
| 00:01 ежедневно | handleRecurringOperations | Создание операций по RecurrenceConfig |
| 01:00 ежедневно | handleSubscriptionExpiration | Downgrade истёкших подписок |
| 02:00 ежедневно | handleMonthlyTokenReplenishment | Пополнение tokensBalance по дню подписки |
| 23:55 ежедневно | handleSystemAnalytics | Запись SystemMetric |
| Воскресенье 03:00 | handleCleanup | Удаление истёкших Token, прочитанных Notification старше 3 мес |

---

## 7. Ошибки

Файл: `apps/back/src/shared/constants/errors.constants.ts`

| Enum | Ключевые коды |
|------|---------------|
| AuthError | USER_NOT_FOUND, INVALID_PASSWORD, EMAIL_NOT_VERIFIED, PIN_REQUIRED, INVALID_TOTP, EMAIL_EXISTS, TOKEN_EXPIRED |
| SubscriptionError | LIMIT_REACHED (args: { max }), PLAN_NOT_FOUND, CANNOT_DELETE_ASSIGNED_PLAN |
| AccountError | NOT_FOUND, ALREADY_EXISTS |
| CategoryError | NOT_FOUND, ALREADY_EXISTS, SELF_PARENT |
| TagError | NOT_FOUND, ALREADY_EXISTS |
| OperationError | NOT_FOUND, CREATION_FAILED, UPDATE_FAILED, DELETION_FAILED |
| RecurrenceError | NOT_FOUND, PLAN_NOT_SUPPORTED |
| FileError | INVALID_FORMAT, SIZE_TOO_LARGE, NO_ROWS, EMPTY |

---

## 8. Ограничения и нюансы

- **Баланс при update/delete:** При изменении или удалении операции баланс счёта **не пересчитывается**. Только create обновляет balance.
- **Отрицательный баланс:** Проверки нет — balance может быть отрицательным.
- **Токены:** Пополнение по дню месяца (subscriptionStartedAt), а не по календарному циклу подписки.
- **createExtractedOperations:** При импорте из AI/Excel — если категория по имени не найдена, создаётся новая (без проверки maxCategories).
- **Charts:** TRANSFER исключаются из findAllForCharts (только INCOME/EXPENSE).

---

## 9. Roadmap / идеи

_Обновляй этот раздел по мере появления планов._

- [ ] Пересчёт баланса при update/delete операции
- [ ] Проверка отрицательного баланса (опционально)
- [ ] ...

---

## 10. Важные файлы

```
prisma/schema.prisma
apps/back/src/core/graphql/schema.gql
apps/back/src/modules/accounts/operation/operation.service.ts
apps/back/src/modules/accounts/recurrenceConfig/recurrence.service.ts
apps/back/src/modules/accounts/account/account.service.ts
apps/back/src/modules/accounts/category/category.service.ts
apps/back/src/modules/accounts/tag/tag.service.ts
apps/back/src/modules/cron/cron.service.ts
apps/back/src/modules/files/ai-upload/ai-upload.service.ts
apps/back/src/shared/utils/subscription-limits.util.ts
apps/back/src/shared/constants/errors.constants.ts
```
