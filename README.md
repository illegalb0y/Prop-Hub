# PropertyHub - Real Estate Projects Aggregator

PropertyHub is a professional web-based real estate aggregator that indexes new development projects. Users can discover projects through a map-first interface, multi-level filtering, and track their favorite projects and viewing history.

## Technical Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui components
- **Maps**: Leaflet with react-leaflet for interactive map displays
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Passport.js with PostgreSQL-backed session storage

### Development & Deployment
- **Build Tool**: Vite
- **Database Migrations**: Drizzle Kit
- **Runtime**: Node.js with NixOS environment

## Key Features
- **Map-Based Discovery**: Interactive map showing project locations across major cities.
- **Advanced Filtering**: Filter projects by city, district, developer, and financing banks.
- **Project Details**: Comprehensive project information including pricing, completion dates, and amenities.
- **User Profiles**: Personalized favorites list and viewing history for authenticated users.
- **Admin Panel**: Robust management interface for Projects, Developers, and Banks with multi-select support, bulk delete/restore actions, and soft-delete functionality.
- **Status & Sorting**: Advanced data management with status filtering (Active/Deleted/All) and multi-field sorting capabilities.
- **Responsive Design**: Optimized for various screen sizes with a modern sidebar navigation.

# 🧠 Memory Bank — PropertyHub

## 📘 Общий обзор
PropertyHub — веб-платформа-агрегатор новостроек. Объединяет данные о застройщиках, банках и жилых комплексах; предоставляет карту с фильтрацией и систему избранного. Включает полнофункциональную панель администратора с поддержкой массовых операций и "мягкого" удаления (soft-delete). Архитектура монорепо: клиент, сервер, shared-модель, конфигурационные скрипты.

---

## ⚙️ Технический стек
**Frontend:** React 18 + TypeScript, Wouter (роутинг), React Query (серверное состояние), Tailwind CSS + shadcn/ui, Leaflet (карты), Lucide React (иконки), Framer Motion (анимации).  
**Backend:** Express.js + TypeScript, PostgreSQL + Drizzle ORM, Passport.js (сессии), Replit Auth (OIDC).  
**Storage & DB:** Реализован паттерн Soft-Delete через поле `deletedAt`. Массовые операции обрабатываются атомарно с детальными логами ошибок.
**DevOps:** Vite (сборка), Drizzle Kit (миграции), Node.js, NixOS runtime.

---

## 🔒 Безопасность
- **Middleware:** CSRF, rate limiting, IP ban, security headers, RBAC, schema validation.  
- **Auth:** OpenID Connect через Replit, хранение сессий в PostgreSQL.  
- **Soft-Delete:** Защита данных от случайного удаления через систему восстановления.
- **Input Validation:** серверная валидация на всех маршрутах API через Zod.

---

## 🧩 Связи и взаимодействие

### Client → Server
- Все запросы к API через REST endpoints на Express.  
- Новые эндпоинты `/api/admin/...` поддерживают фильтрацию по статусу, сортировку и bulk-action.
- React Query отвечает за кеширование и обновление данных клиента.  
- Auth flow выполняется через Replit Auth redirect, cookie-сессии обрабатываются на сервере.

### Server → Database
- Доступ через Drizzle ORM (PostgreSQL).  
- Таблицы: пользователи, проекты, застройщики, банки, избранное, просмотры.  
- Все основные сущности поддерживают поле `deletedAt` для управления жизненным циклом данных.
- Миграции управляются Drizzle Kit.

---

## 🧭 Структура проекта
```
Prop-Hub/
├── client/                # Фронтенд-приложение (React)
│   ├── src/
│   │   ├── components/    # UI и фичи (включая Admin секции)
│   │   ├── pages/         # Маршруты (admin, account, projects, map-page и др.)
│   │   ├── hooks/, lib/, i18n/  # Вспомогательные слои
│   │   └── main.tsx       # Инициализация React
│   └── public/            # Статика
├── server/                # Бэкенд Express + Drizzle
│   ├── middleware/        # Безопасность и валидация
│   ├── replit_integrations/auth/ # Реализация Replit Auth
│   ├── admin-storage.ts   # Логика управления данными в админке
│   ├── admin-routes.ts    # API маршруты для админ-панели
│   ├── db.ts, routes.ts   # Основные подключения
│   └── storage.ts, seed.ts # Данные и загрузчик
├── shared/                # Общие модели и схемы БД
│   ├── schema.ts          # Drizzle schema (с soft-delete полями)
│   └── models/            # Бизнес-логика (auth, users ...)
├── script/                # Служебные скрипты (build, миграции)
└── config, *.ts           # Tailwind, Vite, Drizzle, TS конфиги
```

---

## ⚡ Основные взаимосвязи
```
React (client)
  ↳ Admin UI (Bulk actions, filters)
    ↳ REST API (/api/admin/...)
      ↳ Admin Storage (Soft-delete logic)
        ↳ Drizzle ORM
          ↳ PostgreSQL
```

---

## 🧱 Итог
Архитектура PropertyHub — это модульное монорепо-приложение с безопасным сервером (Express/TypeScript), интерактивным клиентом (React/Leaflet/Tailwind) и развитой системой администрирования. Платформа поддерживает полный жизненный цикл данных через soft-delete и массовые операции, обеспечивая стабильность и удобство управления контентом.