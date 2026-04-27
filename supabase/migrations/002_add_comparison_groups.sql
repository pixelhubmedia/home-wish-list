-- Add lightweight product comparison groups to wishlist items.
-- Items with the same comparison_group inside a room can be compared together.

ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS comparison_group TEXT;
