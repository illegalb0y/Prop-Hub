# Техническая документация для разработчиков PropertyHub

## Содержание
1. [Обзор архитектуры](#обзор-архитектуры)
2. [Настройка окружения разработки](#настройка-окружения-разработки)
3. [Структура проекта](#структура-проекта)
4. [Фронтенд](#фронтенд)
5. [Бэкенд](#бэкенд)
6. [База данных](#база-данных)
7. [Аутентификация](#аутентификация)
8. [API](#api)
9. [Рабочие процессы](#рабочие-процессы)
10. [Лучшие практики](#лучшие-практики)

## Обзор архитектуры

PropertyHub построен как монорепозиторий, объединяющий клиентскую часть, серверную часть и общие модели в единой кодовой базе. Проект использует современный стек технологий:

### Ключевые компоненты:

- **Клиент**: React 18 с TypeScript, Wouter для маршрутизации, React Query для управления состоянием сервера
- **Сервер**: Express.js с TypeScript, интеграция с PostgreSQL через Drizzle ORM
- **Аутентификация**: Replit Auth с OpenID Connect, управление сессиями через Passport.js
- **Общие модели**: Схемы данных и бизнес-логика, используемые как на клиенте, так и на сервере

Архитектура следует принципам REST для API и использует современные подходы к разработке веб-приложений.

## Настройка окружения разработки

### Предварительные требования

- Node.js (версия 16.x или выше)
- PostgreSQL (версия 14.x или выше)
- Git

### Шаги по настройке

1. **Клонирование репозитория**

```bash
git clone https://github.com/your-organization/prop-hub.git
cd prop-hub
```

2. **Установка зависимостей**

```bash
# Установка зависимостей для всего проекта
npm install

# Или установка для отдельных частей
npm --prefix client install
npm --prefix server install
```

3. **Настройка базы данных**

```bash
# Создание базы данных PostgreSQL
createdb prophub_dev

# Запуск миграций
npm run db:migrate
```

4. **Настройка переменных окружения**

Создайте файл `.env` в корне проекта:

```
# База данных
DATABASE_URL=postgresql://username:password@localhost:5432/prophub_dev

# Аутентификация
REPLIT_CLIENT_ID=your_client_id
REPLIT_CLIENT_SECRET=your_client_secret
REPLIT_REDIRECT_URI=http://localhost:3000/auth/callback

# Общие настройки
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
```

5. **Запуск в режиме разработки**

```bash
# Запуск клиента и сервера одновременно
npm run dev

# Или запуск отдельно
npm run dev:client
npm run dev:server
```

## Структура проекта

```
Prop-Hub/
├── client/                # Фронтенд-приложение (React)
│   ├── src/
│   │   ├── components/    # UI и фичи (включая Admin секции)
│   │   ├── pages/         # Маршруты (admin, account, projects, map-page и др.)
│   │   ├── hooks/         # Пользовательские хуки
│   │   ├── lib/           # Утилиты и вспомогательные функции
│   │   ├── i18n/          # Интернационализация
│   │   └── main.tsx       # Инициализация React
│   └── public/            # Статические ресурсы
├── server/                # Бэкенд Express + Drizzle
│   ├── middleware/        # Безопасность и валидация
│   ├── replit_integrations/auth/ # Реализация Replit Auth
│   ├── admin-storage.ts   # Логика управления данными в админке
│   ├── admin-routes.ts    # API маршруты для админ-панели
│   ├── db.ts              # Конфигурация базы данных
│   ├── routes.ts          # Основные маршруты API
│   ├── storage.ts         # Доступ к данным
│   └── seed.ts            # Скрипт для заполнения тестовыми данными
├── shared/                # Общие модели и схемы БД
│   ├── schema.ts          # Drizzle schema (с soft-delete полями)
│   └── models/            # Бизнес-логика (auth, users ...)
├── script/                # Служебные скрипты
└── config/                # Конфигурационные файлы
```

## Фронтенд

### Основные технологии

- **React 18**: Основной фреймворк для построения пользовательского интерфейса
- **TypeScript**: Типизация для повышения надежности кода
- **Wouter**: Легковесная библиотека для маршрутизации
- **TanStack React Query**: Управление серверным состоянием, кеширование и синхронизация
- **Tailwind CSS**: Утилитарный CSS-фреймворк для стилизации
- **shadcn/ui**: Компоненты пользовательского интерфейса
- **Leaflet с react-leaflet**: Интерактивные карты
- **Lucide React**: Иконки
- **Framer Motion**: Анимации

### Структура компонентов

Компоненты организованы по функциональному назначению:

- **Layout**: Компоненты макета (Header, Footer, Sidebar)
- **UI**: Базовые компоненты интерфейса (Button, Input, Card)
- **Features**: Компоненты, связанные с конкретными функциями (ProjectList, MapView, FilterPanel)
- **Admin**: Компоненты для административной панели

### Маршрутизация

Маршрутизация реализована с помощью Wouter:

```typescript
// client/src/App.tsx
import { Route, Switch } from 'wouter';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ProjectPage from './pages/ProjectPage';
import AdminPage from './pages/AdminPage';
import AccountPage from './pages/AccountPage';

function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/map" component={MapPage} />
      <Route path="/projects/:id" component={ProjectPage} />
      <Route path="/admin/*" component={AdminPage} />
      <Route path="/account" component={AccountPage} />
    </Switch>
  );
}
```

### Управление состоянием

Для управления состоянием используется комбинация React Query и локального состояния:

```typescript
// Пример использования React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, updateProject } from '../api/projects';

// Получение данных
const { data: projects, isLoading, error } = useQuery({
  queryKey: ['projects', filters],
  queryFn: () => fetchProjects(filters)
});

// Обновление данных
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: updateProject,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }
});
```

## Бэкенд

### Основные технологии

- **Express.js**: Веб-фреймворк для Node.js
- **TypeScript**: Типизация для повышения надежности кода
- **PostgreSQL**: Реляционная база данных
- **Drizzle ORM**: ORM для работы с базой данных
- **Passport.js**: Аутентификация и управление сессиями
- **Zod**: Валидация данных

### API-маршруты

API организовано по RESTful принципам:

```typescript
// server/routes.ts
import express from 'express';
import { projectsRouter } from './routes/projects';
import { developersRouter } from './routes/developers';
import { banksRouter } from './routes/banks';
import { authRouter } from './routes/auth';
import { adminRouter } from './admin-routes';

const router = express.Router();

router.use('/api/projects', projectsRouter);
router.use('/api/developers', developersRouter);
router.use('/api/banks', banksRouter);
router.use('/api/auth', authRouter);
router.use('/api/admin', adminRouter);

export default router;
```

### Middleware

Для обеспечения безопасности и валидации используются различные middleware:

```typescript
// server/middleware/security.ts
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import csrf from 'csurf';

// Ограничение запросов
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // 100 запросов с одного IP
});

// Защитные заголовки
export const securityHeaders = helmet();

// CSRF защита
export const csrfProtection = csrf({ cookie: true });
```

### Обработка ошибок

```typescript
// server/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err.stack);
  
  // Обработка различных типов ошибок
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  
  // Общая ошибка сервера
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Произошла ошибка на сервере' 
      : err.message
  });
}
```

## База данных

### Схема данных

Основные таблицы в базе данных:

- **users**: Пользователи системы
- **projects**: Проекты недвижимости
- **developers**: Застройщики
- **banks**: Банки, предоставляющие финансирование
- **favorites**: Избранные проекты пользователей
- **views**: История просмотров

Все основные сущности поддерживают механизм "мягкого удаления" через поле `deletedAt`.

### Пример схемы с Drizzle ORM

```typescript
// shared/schema.ts
import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at')
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address'),
  city: text('city').notNull(),
  district: text('district'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  developerId: integer('developer_id').references(() => developers.id),
  completionDate: timestamp('completion_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at')
});

// Другие таблицы...
```

### Миграции

Миграции управляются с помощью Drizzle Kit:

```bash
# Создание миграции
npm run db:generate

# Применение миграций
npm run db:migrate
```

## Аутентификация

### Replit Auth с OpenID Connect

PropertyHub использует Replit Auth для аутентификации через OpenID Connect:

```typescript
// server/replit_integrations/auth/index.ts
import passport from 'passport';
import { Strategy as OpenIDStrategy } from 'passport-openid';
import { db } from '../../db';
import { users } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

// Настройка стратегии OpenID
passport.use(
  new OpenIDStrategy(
    {
      returnURL: process.env.REPLIT_REDIRECT_URI,
      realm: process.env.CLIENT_URL,
      profile: true
    },
    async (identifier, profile, done) => {
      try {
        // Поиск пользователя в базе данных
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, profile.email));
        
        if (existingUser) {
          return done(null, existingUser);
        }
        
        // Создание нового пользователя
        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.displayName
          })
          .returning();
        
        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Сериализация и десериализация пользователя
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    
    done(null, user || null);
  } catch (error) {
    done(error);
  }
});
```

### Защита маршрутов

```typescript
// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

// Проверка аутентификации
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Unauthorized' });
}

// Проверка роли администратора
export function isAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({ error: 'Forbidden' });
}
```

## API

### Основные эндпоинты

#### Проекты

```
GET /api/projects - Получение списка проектов
GET /api/projects/:id - Получение информации о проекте
POST /api/projects - Создание нового проекта (только для админов)
PUT /api/projects/:id - Обновление проекта (только для админов)
DELETE /api/projects/:id - Удаление проекта (только для админов)
```

#### Застройщики

```
GET /api/developers - Получение списка застройщиков
GET /api/developers/:id - Получение информации о застройщике
POST /api/developers - Создание нового застройщика (только для админов)
PUT /api/developers/:id - Обновление застройщика (только для админов)
DELETE /api/developers/:id - Удаление застройщика (только для админов)
```

#### Банки

```
GET /api/banks - Получение списка банков
GET /api/banks/:id - Получение информации о банке
POST /api/banks - Создание нового банка (только для админов)
PUT /api/banks/:id - Обновление банка (только для админов)
DELETE /api/banks/:id - Удаление банка (только для админов)
```

#### Пользователи

```
GET /api/users/me - Получение информации о текущем пользователе
PUT /api/users/me - Обновление профиля пользователя
GET /api/users/me/favorites - Получение избранных проектов
POST /api/users/me/favorites/:projectId - Добавление проекта в избранное
DELETE /api/users/me/favorites/:projectId - Удаление проекта из избранного
```

#### Административные эндпоинты

```
GET /api/admin/projects - Получение списка проектов с фильтрацией по статусу
POST /api/admin/projects/bulk-delete - Массовое удаление проектов
POST /api/admin/projects/bulk-restore - Массовое восстановление проектов
```

### Пример запроса и ответа

#### Запрос

```
GET /api/projects?city=Moscow&limit=10&offset=0
```

#### Ответ

```json
{
  "data": [
    {
      "id": 1,
      "name": "Зеленый квартал",
      "description": "Современный жилой комплекс в экологически чистом районе",
      "address": "ул. Лесная, 42",
      "city": "Moscow",
      "district": "Северный",
      "latitude": "55.7558",
      "longitude": "37.6173",
      "developerId": 3,
      "developer": {
        "id": 3,
        "name": "ГК Строитель"
      },
      "completionDate": "2024-12-31T00:00:00.000Z"
    },
    // Другие проекты...
  ],
  "meta": {
    "total": 45,
    "limit": 10,
    "offset": 0
  }
}
```

## Рабочие процессы

### Разработка новых функций

1. **Создание ветки**: Создайте новую ветку из `main` с названием, соответствующим функционалу
2. **Разработка**: Реализуйте функционал, следуя стандартам кодирования
3. **Тестирование**: Убедитесь, что код работает корректно
4. **Pull Request**: Создайте PR в `main` с описанием изменений
5. **Код-ревью**: Дождитесь ревью от других разработчиков
6. **Слияние**: После одобрения, слейте изменения в `main`

### Обновление базы данных

1. **Изменение схемы**: Обновите файлы схемы в `shared/schema.ts`
2. **Генерация миграции**: Запустите `npm run db:generate`
3. **Проверка миграции**: Просмотрите сгенерированные SQL-файлы
4. **Применение миграции**: Запустите `npm run db:migrate`
5. **Обновление типов**: Обновите типы в коде, если необходимо

## Лучшие практики

### Код

- Используйте TypeScript для всех файлов
- Следуйте принципам чистого кода
- Комментируйте сложные участки кода
- Используйте ESLint и Prettier для форматирования

### Безопасность

- Всегда валидируйте входные данные на сервере
- Используйте параметризованные запросы для предотвращения SQL-инъекций
- Не храните чувствительные данные в коде
- Регулярно обновляйте зависимости

### Производительность

- Используйте кеширование для часто запрашиваемых данных
- Оптимизируйте запросы к базе данных
- Минимизируйте количество HTTP-запросов
- Используйте пагинацию для больших наборов данных

### Тестирование

- Пишите модульные тесты для критических компонентов
- Используйте интеграционные тесты для проверки взаимодействия компонентов
- Тестируйте граничные случаи и обработку ошибок

---

Эта документация предоставляет основную информацию для разработчиков, работающих с PropertyHub. Для получения более подробной информации по конкретным аспектам проекта, обратитесь к соответствующим разделам кодовой базы или свяжитесь с командой разработки.