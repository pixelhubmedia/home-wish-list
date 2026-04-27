-- ============================================================
-- Home Wish List — Initial Schema
-- ============================================================

-- Profiles (synced from auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Houses
CREATE TABLE IF NOT EXISTS public.houses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- House members
CREATE TABLE IF NOT EXISTS public.house_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id   UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(house_id, user_id)
);

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id   UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist items
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id    UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_url TEXT,
  title       TEXT NOT NULL,
  image_url   TEXT,
  retailer    TEXT,
  price       NUMERIC(10, 2),
  comparison_group TEXT,
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'Wishlist'
                CHECK (status IN ('Wishlist','Considering','Purchased','Not buying')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist item reactions
CREATE TABLE IF NOT EXISTS public.wishlist_item_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID NOT NULL REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   TEXT NOT NULL CHECK (reaction IN ('approve','unsure','dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

CREATE INDEX IF NOT EXISTS wishlist_item_reactions_item_id_idx
  ON public.wishlist_item_reactions(item_id);

-- ============================================================
-- Trigger: auto-create profile on sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_item_reactions ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of the given house?
CREATE OR REPLACE FUNCTION public.is_house_member(p_house_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = p_house_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: can the current user react to the given wishlist item?
CREATE OR REPLACE FUNCTION public.can_react_to_wishlist_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wishlist_items wi
    WHERE wi.id = p_item_id
      AND public.is_house_member(wi.house_id)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- Drop all policies first so this script is re-runnable ----
DROP POLICY IF EXISTS "Users can view their own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"   ON public.profiles;

DROP POLICY IF EXISTS "Members can view their house"              ON public.houses;
DROP POLICY IF EXISTS "Authenticated users can create a house"    ON public.houses;
DROP POLICY IF EXISTS "Owner can update the house"                ON public.houses;
DROP POLICY IF EXISTS "Owner can delete the house"                ON public.houses;

DROP POLICY IF EXISTS "Members can view house member list"    ON public.house_members;
DROP POLICY IF EXISTS "Authenticated users can join a house"  ON public.house_members;
DROP POLICY IF EXISTS "Users can leave a house"               ON public.house_members;

DROP POLICY IF EXISTS "Members can view rooms"    ON public.rooms;
DROP POLICY IF EXISTS "Members can create rooms"  ON public.rooms;
DROP POLICY IF EXISTS "Members can update rooms"  ON public.rooms;
DROP POLICY IF EXISTS "Members can delete rooms"  ON public.rooms;

DROP POLICY IF EXISTS "Members can view wishlist items"    ON public.wishlist_items;
DROP POLICY IF EXISTS "Members can create wishlist items"  ON public.wishlist_items;
DROP POLICY IF EXISTS "Members can update wishlist items"  ON public.wishlist_items;
DROP POLICY IF EXISTS "Members can delete wishlist items"  ON public.wishlist_items;

DROP POLICY IF EXISTS "Members can view wishlist item reactions"   ON public.wishlist_item_reactions;
DROP POLICY IF EXISTS "Members can create their own reactions"     ON public.wishlist_item_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions"       ON public.wishlist_item_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions"       ON public.wishlist_item_reactions;

-- ---- profiles ----
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ---- houses ----
CREATE POLICY "Members can view their house"
  ON public.houses FOR SELECT
  USING (public.is_house_member(id));

CREATE POLICY "Authenticated users can create a house"
  ON public.houses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

CREATE POLICY "Owner can update the house"
  ON public.houses FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can delete the house"
  ON public.houses FOR DELETE
  USING (owner_id = auth.uid());

-- ---- house_members ----
CREATE POLICY "Members can view house member list"
  ON public.house_members FOR SELECT
  USING (public.is_house_member(house_id));

CREATE POLICY "Authenticated users can join a house"
  ON public.house_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave a house"
  ON public.house_members FOR DELETE
  USING (user_id = auth.uid());

-- ---- rooms ----
CREATE POLICY "Members can view rooms"
  ON public.rooms FOR SELECT
  USING (public.is_house_member(house_id));

CREATE POLICY "Members can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (public.is_house_member(house_id));

CREATE POLICY "Members can update rooms"
  ON public.rooms FOR UPDATE
  USING (public.is_house_member(house_id));

CREATE POLICY "Members can delete rooms"
  ON public.rooms FOR DELETE
  USING (public.is_house_member(house_id));

-- ---- wishlist_items ----
CREATE POLICY "Members can view wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (public.is_house_member(house_id));

CREATE POLICY "Members can create wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (public.is_house_member(house_id) AND user_id = auth.uid());

CREATE POLICY "Members can update wishlist items"
  ON public.wishlist_items FOR UPDATE
  USING (public.is_house_member(house_id));

CREATE POLICY "Members can delete wishlist items"
  ON public.wishlist_items FOR DELETE
  USING (public.is_house_member(house_id));

-- ---- wishlist_item_reactions ----
CREATE POLICY "Members can view wishlist item reactions"
  ON public.wishlist_item_reactions FOR SELECT
  USING (public.can_react_to_wishlist_item(item_id));

CREATE POLICY "Members can create their own reactions"
  ON public.wishlist_item_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_react_to_wishlist_item(item_id)
  );

CREATE POLICY "Users can update their own reactions"
  ON public.wishlist_item_reactions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND public.can_react_to_wishlist_item(item_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_react_to_wishlist_item(item_id)
  );

CREATE POLICY "Users can delete their own reactions"
  ON public.wishlist_item_reactions FOR DELETE
  USING (
    user_id = auth.uid()
    AND public.can_react_to_wishlist_item(item_id)
  );
