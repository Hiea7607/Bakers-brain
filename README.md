# Business Brain

Business Brain is a multi-tenant SaaS application for food business owners in Bangladesh, India, Sri Lanka, Nepal, and similar developing countries.

## Live Demo
- **URL:** https://businessbrain-api-server.vercel.app/
- **Demo Email:** b5@bakery.com
- **Demo Password:** test@123

## Prerequisites
- Node.js (v18 or higher)
- pnpm (v10.x)

## Setup Instructions

1. **Database Setup**
   - Create a Supabase PostgreSQL database.
   - Run the `database/schema.sql` script in your SQL Editor to create tables.
   - Run the `database/seed.sql` script to insert test data.

2. **Environment Configuration**
   - Copy `.env.example` and rename it to `.env`.
   - Fill in your actual `DATABASE_URL` and `SUPABASE` keys.

3. **Install Dependencies**
   Run the following command to install all packages:
   ```bash
   pnpm install --no-frozen-lockfile