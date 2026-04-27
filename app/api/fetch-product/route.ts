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
  // Handle ranges like "£499 - £999" — take the first number
  const match = raw.match(/[\d,]+\.?\d{0,2}/)
  if (!match) return null
  const num = parseFloat(match[0].replace(/,/g, ''))
  return isNaN(num) || num <= 0 ? null : num
}

function isBlockedPage(html: string): boolean {
  return (
    html.includes('Just a moment') ||
    html.includes('cf-browser-verification') ||
    html.includes('Enable JavaScript and cookies') ||
    html.includes('DDoS protection') ||
    html.includes('Checking your browser') ||
    html.length < 1000
  )
}

function parseHtml(html: string, url: string) {
  const $ = cheerio.load(html)

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text().split('|')[0].split('-')[0].trim() ||
    null

  const imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:secure_url"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    $('meta[name="twitter:image:src"]').attr('content') ||
    null

  const priceRaw =
    $('meta[property="product:price:amount"]').attr('content') ||
    $('meta[property="og:price:amount"]').attr('content') ||
    $('meta[itemprop="price"]').attr('content') ||
    $('[itemprop="price"]').attr('content') ||
    $('[itemprop="price"]').first().text().trim() ||
    $('[class*="price__current"]').first().text().trim() ||
    $('[class*="price-now"]').first().text().trim() ||
    $('[class*="sale-price"]').first().text().trim() ||
    $('[class*="product-price"]').first().text().trim() ||
    $('[data-testid*="price"]').first().text().trim() ||
    $('[class*="price"]').first().text().trim() ||
    null

  return {
    title: title?.trim() || null,
    image_url: imageUrl || null,
    price: cleanPrice(priceRaw ?? undefined),
    retailer: extractDomain(url),
    product_url: url,
  }
}

async function fetchViaMicrolink(url: string) {
  const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true&screenshot=false`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(apiUrl, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null

    const json = await res.json()
    if (json.status !== 'success' || !json.data) return null

    const { title, image, price } = json.data
    return {
      title: title || null,
      image_url: image?.url || null,
      price: price?.amount ? parseFloat(price.amount) : null,
      retailer: extractDomain(url),
      product_url: url,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}

export async function POST(request: Request) {
  let url: string
  try {
    const body = await request.json()
    url = body.url
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const fallback = { title: null, image_url: null, price: null, retailer: extractDomain(url), product_url: url }

  // --- Attempt 1: direct fetch + HTML parse ---
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    })
    clearTimeout(timeout)

    if (res.ok) {
      const html = await res.text()
      if (!isBlockedPage(html)) {
        const result = parseHtml(html, url)
        // If we got a title or image, return it — otherwise fall through to Microlink
        if (result.title || result.image_url) {
          return NextResponse.json(result)
        }
      }
    }
  } catch {
    // Timeout or network error — fall through to Microlink
  }

  // --- Attempt 2: Microlink (handles Cloudflare, JS-rendered pages) ---
  const microlink = await fetchViaMicrolink(url)
  if (microlink && (microlink.title || microlink.image_url)) {
    return NextResponse.json(microlink)
  }

  // --- All methods failed — return retailer name so user can fill in manually ---
  return NextResponse.json(fallback)
}
