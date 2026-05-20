-- Supabase Schema Initialization For Conquista App (V&C Quantum)
-- Created: 2026-05-20
-- Migration Name: init_schema

-- 1. Create Users (Profiles) Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    store TEXT DEFAULT 'Loja Google',
    password TEXT DEFAULT 'oauth-protected',
    role TEXT CHECK (role IN ('vendedor', 'admin')) DEFAULT 'vendedor',
    photo_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Settings Table (Storing Targets and Commission configurations)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY, -- 'targets' or 'targets_{userId}'
    product NUMERIC DEFAULT 50000,
    assistance NUMERIC DEFAULT 3000,
    waterproofing NUMERIC DEFAULT 2000,
    product_commission_rate NUMERIC DEFAULT 2.2,
    meta_ativacao JSONB DEFAULT '{"product": true, "assistance": true, "waterproofing": true}'::jsonb,
    premiacao_extra JSONB DEFAULT '{"metaValor": 20000, "valorPremio": 100, "ativo": false, "dataInicio": "", "dataFim": ""}'::jsonb,
    service_bonuses JSONB DEFAULT '{"montagem": 10, "lavagem": 40, "almofada": 10, "pes_guarda_roupa": 7, "impermeabilizacao_bonus": 40}'::jsonb,
    levels JSONB DEFAULT '{"1": {"threshold": 100, "rate": 0.6}, "2": {"threshold": 120, "rate": 0.8}, "3": {"threshold": 140, "rate": 1.1}}'::jsonb,
    bonus_por_pedido JSONB DEFAULT '{"ativo": false, "valor": 5}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf TEXT,
    endereco TEXT,
    data_cadastro TEXT NOT NULL,
    total_comprado NUMERIC DEFAULT 0,
    pedidos_count INTEGER DEFAULT 0,
    vendedor_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    interesse TEXT,
    data_retorno TEXT,
    status_retorno TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Sales Table (Vendas / Pedidos)
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    numero_pedido TEXT NOT NULL,
    vendedor_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    cliente_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    valor_produto NUMERIC DEFAULT 0,
    valor_assistencia NUMERIC DEFAULT 0,
    valor_impermeabilizacao NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    data TEXT NOT NULL, -- Formato DD/MM/AAAA
    timestamp BIGINT NOT NULL,
    bonus_total NUMERIC DEFAULT 0,
    comissao_produto NUMERIC DEFAULT 0,
    servicos_extras TEXT[] DEFAULT '{}'::text[],
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Opportunities Table (Funis / CRM Pipeline)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT,
    value NUMERIC DEFAULT 0,
    days_ago INTEGER DEFAULT 0,
    stage TEXT DEFAULT 'lead',
    vendedor_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    user_info JSONB DEFAULT '{}'::jsonb, -- name and avatar URL
    tags TEXT[] DEFAULT '{}'::text[],
    phone TEXT,
    return_date TEXT,
    product_interest TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Create Access Logs Table (Registro de Acessos)
CREATE TABLE IF NOT EXISTS public.access_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    store TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    action TEXT DEFAULT 'access'
);

-- Enable Row Level Security (RLS) on all tables for data protection
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow full read and write access for development and production environments
-- We use public policies since the dashboard matches multiple authentication methods (Firebase + Supabase anon client).

CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete users" ON public.users FOR DELETE USING (true);

CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update settings" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete settings" ON public.settings FOR DELETE USING (true);

CREATE POLICY "Allow public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete customers" ON public.customers FOR DELETE USING (true);

CREATE POLICY "Allow public read sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow public insert sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update sales" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Allow public delete sales" ON public.sales FOR DELETE USING (true);

CREATE POLICY "Allow public read opportunities" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Allow public insert opportunities" ON public.opportunities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update opportunities" ON public.opportunities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete opportunities" ON public.opportunities FOR DELETE USING (true);

CREATE POLICY "Allow public read access_logs" ON public.access_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access_logs" ON public.access_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access_logs" ON public.access_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access_logs" ON public.access_logs FOR DELETE USING (true);

-- Create Indexes to optimize queries
CREATE INDEX IF NOT EXISTS idx_sales_vendedor ON public.sales(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_sales_cliente ON public.sales(cliente_id);
CREATE INDEX IF NOT EXISTS idx_customers_vendedor ON public.customers(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_vendedor ON public.opportunities(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON public.access_logs(timestamp DESC);
