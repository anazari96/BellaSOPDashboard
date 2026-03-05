# ☕ Bella SOP Dashboard

A mobile-first Standard Operating Procedure (SOP) platform for cafe teams. Built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Role-based access** — Admin and staff accounts with separate capabilities
- **SOP categories** — Brewing, Cleaning, Recipes, Customer Service, Kitchen Prep, Desserts, Opening, Closing
- **Step-by-step viewer** — Interactive SOP walkthroughs with progress tracking
- **Progress tracking** — Staff can check off steps and see completion status
- **Media support** — Images and videos embedded in SOP steps
- **Importance tagging** — Critical 🔴, High 🟠, Medium 🟡, Low 🟢
- **Admin dashboard** — Create, edit, and publish SOPs with a drag-and-drop step editor
- **Mobile-first design** — Bottom navigation on mobile, sidebar on desktop

## Tech Stack

- **Next.js 15** (App Router, Server Components)
- **Supabase** (Auth, PostgreSQL, Storage, RLS)
- **Tailwind CSS v4**
- **TypeScript**

## Getting Started

### 1. Clone and install

```bash
cd BellaSOPDashboard
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, storage buckets, and seeds the default categories.

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these values in your Supabase dashboard under **Settings > API**.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Create your first account

1. Go to `/register`
2. Create an **admin** account (select the Admin role)
3. Start creating SOPs!

## Project Structure

```
src/
├── app/
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   └── (authenticated)/    # Protected routes
│       ├── dashboard/      # Role-based dashboard
│       ├── sops/           # Browse & view SOPs
│       ├── progress/       # Staff progress tracking
│       ├── profile/        # User profile
│       └── admin/          # Admin-only routes
│           ├── sops/       # Manage SOPs (CRUD)
│           └── categories/ # Manage categories
├── components/
│   ├── auth/               # Auth provider
│   ├── layout/             # Navigation components
│   ├── sop/                # SOP display components
│   └── admin/              # Admin form components
└── lib/
    ├── supabase/           # Supabase client setup
    ├── types.ts            # TypeScript types
    └── utils.ts            # Shared utilities
```

## Default SOP Categories

| Emoji | Category | Description |
|-------|----------|-------------|
| 🌅 | Opening | Morning opening checklists |
| 🌙 | Closing | End-of-day shutdown procedures |
| ☕ | Brewing | Espresso, pour-over, cold brew, tea |
| 📖 | Recipes | Drink and food recipes |
| 🍳 | Kitchen Prep | Food safety, storage, mise en place |
| 🍰 | Desserts | Pastry prep, plating, storage |
| 🧹 | Cleaning | Daily, weekly, deep cleaning |
| 😊 | Customer Service | Greeting, complaints, upselling |
