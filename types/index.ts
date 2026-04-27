export type Profile = {
  id: string
  email: string
  created_at: string
}

export type House = {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
  updated_at: string
}

export type HouseMember = {
  id: string
  house_id: string
  user_id: string
  role: 'owner' | 'member'
  created_at: string
}

export type Room = {
  id: string
  house_id: string
  name: string
  created_at: string
  updated_at: string
}

export type WishlistItemStatus = 'Wishlist' | 'Considering' | 'Purchased' | 'Not buying'

export type WishlistItem = {
  id: string
  house_id: string
  room_id: string
  user_id: string
  product_url: string | null
  title: string
  image_url: string | null
  retailer: string | null
  price: number | null
  comparison_group: string | null
  notes: string | null
  status: WishlistItemStatus
  created_at: string
  updated_at: string
}

export type ProductMetadata = {
  title: string | null
  image_url: string | null
  price: number | null
  retailer: string | null
  product_url: string
}
