import { NextResponse } from 'next/server'

type Source = { label: string; edns: string }

const SOURCES: Source[] = [
  { label: 'usSan Francisco CA, United States', edns: '8.8.8.8/32' },
  { label: 'OpenDNS', edns: '208.67.222.222/32' },
  { label: 'usMountain View CA, United States', edns: '8.8.4.4/32' },
  { label: 'Google', edns: '8.8.8.8/32' },
  { label: 'usBerkeley, US', edns: '34.102.136.0/24' },
  { label: 'Quad9', edns: '9.9.9.9/32' },
  { label: 'usSan Jose, United States', edns: '34.102.0.0/24' },
  { label: 'Corporate West Computer Systems', edns: '45.33.0.0/24' },
  { label: 'usKansas City, United States', edns: '199.192.0.0/24' },
  { label: 'WholeSale Internet, Inc.', edns: '64.71.128.0/24' },
  { label: 'usAshburn, United States', edns: '52.0.0.0/16' },
  { label: 'NeuStar', edns: '156.154.70.0/24' },
  { label: 'usFort Dodge, United States', edns: '8.8.8.8/32' },
  { label: 'Aureon Network Services', edns: '206.9.0.0/24' },
  { label: 'caBurnaby, Canada', edns: '64.71.128.0/24' },
  { label: 'Fortinet Inc', edns: '103.30.136.0/24' },
  { label: 'ruSt Petersburg, Russia', edns: '93.158.0.0/16' },
  { label: 'YANDEX LLC', edns: '77.88.8.8/32' },
  { label: 'zaCullinan, South Africa', edns: '196.40.0.0/16' },
  { label: 'Liquid Telecommunications Ltd', edns: '154.0.0.0/8' },
  { label: 'nlDiemen, Netherlands', edns: '146.185.0.0/16' },
  { label: 'Tele2 Nederland B.V.', edns: '212.184.0.0/16' },
  { label: 'frLille, France', edns: '37.187.0.0/16' },
  { label: 'Completel SAS', edns: '195.220.0.0/16' },
  { label: 'esPaterna de Rivera, Spain', edns: '85.58.0.0/16' },
  { label: 'ServiHosting Networks S.L.', edns: '80.24.0.0/16' },
  { label: 'atInnsbruck, Austria', edns: '85.13.128.0/17' },
  { label: 'nemox.net', edns: '5.9.0.0/16' },
  { label: 'gbSalford, United Kingdom', edns: '193.120.0.0/14' },
  { label: 'Wavenet Limited', edns: '92.22.0.0/15' },
  { label: 'deLeipzig, Germany', edns: '85.214.0.0/16' },
  { label: 'Universitaet Leipzig', edns: '131.130.0.0/16' },
  { label: 'mxMexico City, Mexico', edns: '186.3.0.0/16' },
  { label: 'Universidad LatinoAmericana S.C.', edns: '201.144.0.0/16' },
  { label: 'brSao Paulo, Brazil', edns: '177.54.0.0/16' },
  { label: 'Vogel Solucoes em Telecom e Informatica S/A', edns: '200.144.0.0/16' },
  { label: 'auResearch, Australia', edns: '203.0.113.0/24' },
  { label: 'Cloudflare Inc', edns: '1.1.1.1/32' },
  { label: 'auMelbourne, Australia', edns: '203.0.113.128/25' },
  { label: 'Pacific Internet', edns: '202.6.0.0/16' },
  { label: 'nzAuckland, New Zealand', edns: '202.7.0.0/16' },
  { label: 'Global-Gateway Internet', edns: '103.246.0.0/16' },
  { label: 'sgSingapore', edns: '139.99.0.0/16' },
  { label: 'DigitalOcean LLC', edns: '138.68.0.0/16' },
  { label: 'krSeoul, South Korea', edns: '121.78.0.0/16' },
  { label: 'KT Corporation', edns: '210.220.163.0/24' },
  { label: 'cnXinfeng, China', edns: '221.226.0.0/16' },
  { label: 'Nanjing Xinfeng Information Technologies Inc.', edns: '183.129.0.0/16' },
  { label: 'trAntalya, Turkey', edns: '77.92.0.0/16' },
  { label: 'Teknet Yazlim', edns: '185.35.0.0/16' },
  { label: 'inCoimbatore, India', edns: '103.64.0.0/16' },
  { label: 'Skylink Fibernet Private Limited', edns: '103.98.0.0/16' },
  { label: 'pkIslamabad, Pakistan', edns: '203.99.0.0/16' },
  { label: 'CMPak Limited', edns: '119.160.0.0/16' },
  { label: 'ieDublin, Ireland', edns: '46.16.0.0/16' },
  { label: 'Indigo', edns: '213.105.0.0/16' },
  { label: 'bdDhaka, Bangladesh', edns: '103.78.0.0/16' }
]

// helper: fetch with timeout and normalized response
async function fetchDnsForSource(name: string, type: string, source: Source, timeoutMs = 7000) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}&edns_client_subnet=${encodeURIComponent(source.edns)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: controller.signal
    })
    clearTimeout(timer)
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return { source: source.label, edns: source.edns, ok: false, error: `HTTP ${res.status}` }
    }
    return { source: source.label, edns: source.edns, ok: true, result: json }
  } catch (err: any) {
    clearTimeout(timer)
    const msg = err?.name === 'AbortError' ? 'timeout' : (err?.message || String(err))
    return { source: source.label, edns: source.edns, ok: false, error: msg }
  }
}

// Batch requests to avoid opening too many concurrent fetches.
// Replace BATCH_SIZE to tune concurrency.
const BATCH_SIZE = 12

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    const type = String(body.type || 'A').trim().toUpperCase()
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const results: any[] = []
    for (let i = 0; i < SOURCES.length; i += BATCH_SIZE) {
      const batch = SOURCES.slice(i, i + BATCH_SIZE)
      const promises = batch.map((s) => fetchDnsForSource(name, type, s))
      const settled = await Promise.all(promises)
      results.push(...settled)
    }

    return NextResponse.json({ query: name, type, results })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
