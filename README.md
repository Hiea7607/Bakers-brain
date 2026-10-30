# Business Brain

Business Brain is a multi-tenant SaaS application for food business owners in Bangladesh.

## Live Demo
- **URL:** https://businessbrain-api-server.vercel.app/
- **Demo Access:** Please register a secure test account on the login page to evaluate the application.

## Prerequisites
- Node.js (v18 or higher)
- pnpm (v10.x)

## Setup Instructions

1. **Database Setup**
   - Create a Supabase PostgreSQL database.
   - Run the `database/schema.sql` script in your SQL Editor to create tables and enable Row Level Security (RLS).
   - Run the `database/seed.sql` script to insert fictional test data.

2. **Environment Configuration**
   - Copy `.env.example` and rename it to `.env`.
   - Fill in your actual `DATABASE_URL` and `SUPABASE` keys.

3. **Install Dependencies**
   Run the following command to install all packages:
   ```bash
   pnpm install --frozen-lockfile