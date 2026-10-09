-- Migration for Catalogs and Products

-- Create catalogs table
CREATE TABLE IF NOT EXISTS public.catalogs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT catalogs_pkey PRIMARY KEY (id),
  CONSTRAINT catalogs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT catalogs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create catalog items table (Products)
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  catalog_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric(10,2),
  url text,
  media_type text DEFAULT 'image'::text, -- 'image' or 'video'
  media_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT catalog_items_pkey PRIMARY KEY (id),
  CONSTRAINT catalog_items_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.catalogs(id) ON DELETE CASCADE
);

-- Add Row Level Security (RLS) policies if needed (assuming org_id controls access)
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalogs are viewable by users in the same organization" ON public.catalogs
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = catalogs.organization_id));

CREATE POLICY "Catalogs are insertable by users in the same organization" ON public.catalogs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Catalogs are updatable by users in the same organization" ON public.catalogs
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = catalogs.organization_id));

CREATE POLICY "Catalogs are deletable by users in the same organization" ON public.catalogs
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.users WHERE organization_id = catalogs.organization_id));

CREATE POLICY "Catalog items are viewable by users in the same organization" ON public.catalog_items
  FOR SELECT USING (catalog_id IN (SELECT id FROM public.catalogs WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Catalog items are insertable by users in the same organization" ON public.catalog_items
  FOR INSERT WITH CHECK (catalog_id IN (SELECT id FROM public.catalogs WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Catalog items are updatable by users in the same organization" ON public.catalog_items
  FOR UPDATE USING (catalog_id IN (SELECT id FROM public.catalogs WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Catalog items are deletable by users in the same organization" ON public.catalog_items
  FOR DELETE USING (catalog_id IN (SELECT id FROM public.catalogs WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())));
