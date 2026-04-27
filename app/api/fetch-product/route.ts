import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export const runtime = 'nodejs'

type ProductResult = {
  title: string | null
  image_url: string | null
  price: number | null
  retailer: string | null
  product_url: string
  source?: string
}

type JsonRecord = Record<string, unknown>

const PRODUCT_TYPE_NAMES = new Set(['Product', 'ProductModel'])

function normalizeUrl(rawUrl: string): string {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  const url = new URL(withProtocol)
  url.hash = ''
  return url.toString()
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return hostname.split('.').slice(0, -1).join(' ') || hostname
  } catch {
    return ''
  }
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim()

  return cleaned || null
}

function cleanTitle(raw: string | null | undefined, url: string): string | null {
  const title = cleanText(raw)
  if (!title) return null

  const retailer = extractDomain(url)
  const separators = [' | ', ' - ', ' – ', ' — ', ' :: ']
  for (const separator of separators) {
    const parts = title.split(separator).map((part) => part.trim()).filter(Boolean)
    if (parts.length < 2) continue

    const last = parts[parts.length - 1].toLowerCase()
    if (retailer && last.includes(retailer.split(' ')[0].toLowerCase())) {
      return parts.slice(0, -1).join(separator)
    }
  }

  return title
}

function cleanPrice(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null

  const value = String(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/[^\d.,]/g, ' ')
    .trim()

  const matches = value.match(/\d{1,3}(?:[,\s]\d{3})*(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?/g)
  if (!matches?.length) return null

  const normalized = matches[0]
    .replace(/\s/g, '')
    .replace(/,(?=\d{3}(?:\D|$))/g, '')
    .replace(/,(?=\d{2}$)/, '.')

  const num = parseFloat(normalized)
  return Number.isFinite(num) && num > 0 ? num : null
}

function absoluteUrl(rawUrl: unknown, baseUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.startsWith('data:')) return null

  try {
    return new URL(trimmed, baseUrl).toString()
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value ? [value] : []
}

function getString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function getJsonTypes(node: JsonRecord): string[] {
  const type = node['@type']
  return asArray(type).map((item) => String(item))
}

function collectJsonLdNodes(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap(collectJsonLdNodes)
  if (!isRecord(value)) return []

  const graph = value['@graph']
  const childNodes = Array.isArray(graph) ? graph.flatMap(collectJsonLdNodes) : []
  return [value, ...childNodes]
}

function findProductJsonLd($: cheerio.CheerioAPI): JsonRecord | null {
  const nodes: JsonRecord[] = []

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text()
    if (!raw.trim()) return

    try {
      nodes.push(...collectJsonLdNodes(JSON.parse(raw)))
    } catch {
      const candidates = raw.match(/\{[\s\S]*\}/g) || []
      for (const candidate of candidates) {
        try {
          nodes.push(...collectJsonLdNodes(JSON.parse(candidate)))
        } catch {
          // Ignore malformed JSON-LD blocks.
        }
      }
    }
  })

  return nodes.find((node) => getJsonTypes(node).some((type) => PRODUCT_TYPE_NAMES.has(type))) || null
}

function extractJsonLdProduct(product: JsonRecord, url: string): Partial<ProductResult> {
  const offers = asArray(product.offers).filter(isRecord)
  const aggregateOffer = offers.find((offer) => getJsonTypes(offer).includes('AggregateOffer'))
  const offer = offers.find((item) => item !== aggregateOffer) || aggregateOffer

  const imageCandidate = asArray(product.image)[0]
  const imageUrl = isRecord(imageCandidate)
    ? absoluteUrl(getString(imageCandidate.url), url)
    : absoluteUrl(getString(imageCandidate), url)

  return {
    title: cleanTitle(getString(product.name), url),
    image_url: imageUrl,
    price: cleanPrice(offer?.price ?? offer?.lowPrice ?? offer?.highPrice),
  }
}

function getAttr($: cheerio.CheerioAPI, selectors: string[], attr = 'content'): string | null {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().attr(attr))
    if (value) return value
  }
  return null
}

function getText($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    const value = cleanText($(selector).first().text())
    if (value) return value
  }
  return null
}

function parseHtml(html: string, url: string): ProductResult {
  const $ = cheerio.load(html)
  const jsonProduct = findProductJsonLd($)
  const structured = jsonProduct ? extractJsonLdProduct(jsonProduct, url) : {}

  const metaTitle =
    getAttr($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]',
      'meta[itemprop="name"]',
    ]) ||
    getText($, [
      '[data-testid*="product-title" i]',
      '[class*="product-title" i]',
      '[class*="product_title" i]',
      '[class*="pdp-title" i]',
      '[class*="title" i] h1',
      'h1',
      'title',
    ])

  const metaImage =
    getAttr($, [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:image:src"]',
      'meta[name="twitter:image"]',
      'meta[itemprop="image"]',
    ]) ||
    getAttr($, [
      'img[data-testid*="product" i]',
      'img[class*="product" i]',
      'img[class*="main" i]',
      '[class*="gallery" i] img',
      '[id*="gallery" i] img',
      '.item.active img',
      'main img',
      'article img',
    ], 'src') ||
    getAttr($, [
      'img[data-testid*="product" i]',
      'img[class*="product" i]',
      'img[class*="main" i]',
      '[class*="gallery" i] img',
      '[id*="gallery" i] img',
      '.item.active img',
      'main img',
      'article img',
    ], 'data-src')

  const priceRaw =
    getAttr($, [
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[property="product:sale_price:amount"]',
      'meta[itemprop="price"]',
    ]) ||
    getText($, [
      '[itemprop="price"]',
      '[data-testid*="price" i]',
      '[data-test*="price" i]',
      '[aria-label*="price" i]',
      '[class*="price__current" i]',
      '[class*="current-price" i]',
      '[class*="price-now" i]',
      '[class*="sale-price" i]',
      '[class*="product-price" i]',
      '[class*="price" i]',
    ])

  const retailer =
    getAttr($, ['meta[property="og:site_name"]']) ||
    extractDomain(url)

  return {
    title: structured.title || cleanTitle(metaTitle, url),
    image_url: structured.image_url || absoluteUrl(metaImage, url),
    price: structured.price || cleanPrice(priceRaw),
    retailer,
    product_url: url,
    source: structured.title || structured.price ? 'json-ld' : 'html',
  }
}

function isBlockedPage(html: string): boolean {
  const lowered = html.toLowerCase()
  return (
    lowered.includes('just a moment') ||
    lowered.includes('cf-browser-verification') ||
    lowered.includes('enable javascript and cookies') ||
    lowered.includes('ddos protection') ||
    lowered.includes('checking your browser') ||
    lowered.includes('captcha') ||
    html.length < 500
  )
}

function hasUsefulData(result: ProductResult): boolean {
  return Boolean(result.image_url || result.price || (result.title && !isGenericTitle(result.title)))
}

function isGenericTitle(title: string): boolean {
  const lowered = title.toLowerCase()
  return [
    'products - discover',
    'shop all',
    'official site',
    'access denied',
    'attention required',
    'page not found',
    'not found',
    'forbidden',
    'captcha',
    'just a moment',
  ].some((pattern) => lowered.includes(pattern))
}

async function fetchHtml(url: string, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    })

    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return null

    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchViaMicrolink(url: string): Promise<ProductResult | null> {
  const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true&screenshot=false&audio=false&video=false`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const res = await fetch(apiUrl, { signal: controller.signal })
    if (!res.ok) return null

    const json = await res.json()
    if (json.status !== 'success' || !json.data) return null

    const { title, image, price, publisher, author, logo } = json.data
    return {
      title: cleanTitle(title, url),
      image_url: absoluteUrl(image?.url || logo?.url, url),
      price: cleanPrice(price?.amount ?? price),
      retailer: cleanText(publisher || author) || extractDomain(url),
      product_url: url,
      source: 'microlink',
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: Request) {
  let url: string

  try {
    const body = await request.json()
    url = normalizeUrl(String(body.url || ''))
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol')
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const fallback: ProductResult = {
    title: null,
    image_url: null,
    price: null,
    retailer: extractDomain(url),
    product_url: url,
    source: 'fallback',
  }

  try {
    const html = await fetchHtml(url, 10000)
    if (html && !isBlockedPage(html)) {
      const result = parseHtml(html, url)
      if (hasUsefulData(result)) {
        return NextResponse.json({ ...fallback, ...result })
      }
    }
  } catch {
    // Network errors and timeouts fall through to the metadata service.
  }

  const microlink = await fetchViaMicrolink(url)
  if (microlink && hasUsefulData(microlink)) {
    return NextResponse.json({ ...fallback, ...microlink })
  }

  return NextResponse.json(fallback)
}
