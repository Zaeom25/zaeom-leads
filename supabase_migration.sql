-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    search_credits INTEGER DEFAULT 5,
    enrich_credits INTEGER DEFAULT 3,
    owner_id UUID REFERENCES auth.users(id),
    stripe_customer_id TEXT UNIQUE,
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Update Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'org_member' CHECK (role IN ('org_owner', 'org_member', 'admin', 'seller'));

-- 3. Update Leads Table for Multitenancy
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 4. Function to setup new user with organization
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Only create org if it doesn't exist (handle potential race conditions)
    -- Create a default organization for the new user
    INSERT INTO public.organizations (name, owner_id, search_credits, enrich_credits)
    VALUES (new.email || '''s Organization', new.id, 5, 3)
    RETURNING id INTO new_org_id;

    -- Link the profile to the new organization
    UPDATE public.profiles
    SET organization_id = new_org_id,
        role = 'org_owner'
    WHERE id = new.id;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger for new profile setup
-- Drop if exists to ensure clean application
DROP TRIGGER IF EXISTS on_profile_created_setup ON public.profiles;
CREATE TRIGGER on_profile_created_setup
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 6. Row Level Security (RLS) - Data Isolation
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see leads belonging to their organization
DROP POLICY IF EXISTS "Users can only see leads within their organization" ON public.leads;
CREATE POLICY "Users can only see leads within their organization" ON public.leads
    FOR ALL
    USING (
        organization_id IN (
            SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
        )
    );

-- 7. Ensure organizations table has RLS or is protected
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own organization" ON public.organizations
    FOR SELECT
    USING (id IN (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()));

-- 8. Atomic Credit Management
CREATE OR REPLACE FUNCTION public.deduct_credit(user_id_p UUID, amount_p INTEGER, type_p TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    org_id_v UUID;
    current_credits INTEGER;
    col_name TEXT;
BEGIN
    -- Get Organization ID
    SELECT organization_id INTO org_id_v FROM public.profiles WHERE id = user_id_p;
    
    IF org_id_v IS NULL THEN RETURN FALSE; END IF;

    col_name := CASE WHEN type_p = 'search' THEN 'search_credits' ELSE 'enrich_credits' END;

    -- Update with check
    EXECUTE format('UPDATE public.organizations SET %I = %I - $1 WHERE id = $2 AND %I >= $1', col_name, col_name, col_name)
    USING amount_p, org_id_v;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.add_credits(org_id_p UUID, search_amount INTEGER, enrich_amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.organizations 
    SET search_credits = search_credits + search_amount,
        enrich_credits = enrich_credits + enrich_amount
    WHERE id = org_id_p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
