-- Add per-user partner reactions to wishlist items.
-- Each household member can approve, mark unsure, or dislike an item.

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

ALTER TABLE public.wishlist_item_reactions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_react_to_wishlist_item(p_item_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wishlist_items wi
    WHERE wi.id = p_item_id
      AND public.is_house_member(wi.house_id)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Members can view wishlist item reactions"   ON public.wishlist_item_reactions;
DROP POLICY IF EXISTS "Members can create their own reactions"     ON public.wishlist_item_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions"       ON public.wishlist_item_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions"       ON public.wishlist_item_reactions;

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
