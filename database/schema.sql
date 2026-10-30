CREATE TABLE IF NOT EXISTS public.client_roster (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'business',
    owner_name TEXT,
    business_name TEXT DEFAULT 'Business Account',
    is_locked BOOLEAN DEFAULT FALSE,
    expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    min_stock_level NUMERIC(12,3) NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    recipe JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    advance_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    due_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    profit NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    delivery_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
