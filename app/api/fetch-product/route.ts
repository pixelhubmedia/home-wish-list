import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'

function extractDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '')
  } catch {
    return ''
  }
}

function cleanPrice(raw: string | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export async function POST(request: Request) {
  let url: string
  try {
    const body = await request.json()
    url = body.url
    new URL(url) // validate
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({
        title: null,
        image_url: null,
        price: null,
        retailer: extractDomain(url),
        product_url: url,
      })
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    // Title
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text().split('|')[0].split('-')[0].trim() ||
      null

    // Image
    const imageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content') ||
      null

    // Price — try several common patterns
    const priceRaw =
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content') ||
      $('meta[itemprop="price"]').attr('content') ||
      $('[itemprop="price"]').attr('content') ||
      $('[itemprop="price"]').first().text().trim() ||
      $('[class*="price"]').first().text().trim() ||
      $('[id*="price"]').first().text().trim() ||
      null

    const price = cleanPrice(priceRaw ?? undefined)
    const retailer = extractDomain(url)

    return NextResponse.json({
      title: title?.trim() || null,
      image_url: imageUrl || null,
      price,
      retailer,
      product_url: url,
    })
  } catch {
    // Network error, CORS, timeout, etc. — return partial data
    return NextResponse.json({
      title: null,
      image_url: null,
      price: null,
      retailer: extractDomain(url),
      product_url: url,
    })
  }
}
