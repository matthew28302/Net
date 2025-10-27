import React, { useState } from 'react'

type DNSAnswer = { name: string; type: number; TTL: number; data: string }
type SourceResult = { source: string; edns: string; ok: boolean; result?: any; error?: string }

/**
 * Updated:
 * - Reduce top margin so search card sits closer to navbar (mt-6)
 * - Make search card layout identical to CheckHost: balanced padding, centered, consistent rounded border
 * - Inputs evenly spaced and full width; button aligned to the right
 * - Monochrome look preserved
 */
export default function DigTab() {
  const [domain, setDomain] = useState('')
  const [type, setType] = useState('A')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SourceResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleQuery() {
    setError(null)
    setResults(null)
    if (!domain.trim()) {
      setError('Vui lòng nhập domain')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/dig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domain.trim(), type })
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setResults(json.results || null)
    } catch (e: any) {
      setError(e?.message || 'Lỗi khi truy vấn')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 px-4"> {/* mt-6 để gần navbar như CheckHost */}
      {/* Query card - styled to match CheckHost */}
      <div className="bg-white border border-black/10 rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-8">
            <input
              aria-label="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full px-4 py-3 rounded-lg border border-black/10 bg-white text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="col-span-6 md:col-span-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-black/10 bg-white text-black"
            >
              {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-6 md:col-span-2 flex justify-end">
            <button
              onClick={handleQuery}
              disabled={loading}
              className="inline-flex items-center px-4 py-3 border border-black/20 bg-black text-white rounded-lg hover:bg-black/90 disabled:opacity-60"
            >
              {loading ? 'Đang...' : 'Query'}
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-rose-600 mt-3">{error}</div>}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white border border-black/10 rounded-md p-4 shadow-sm mt-6">
          <div className="text-sm text-black/70 mb-3">
            Kết quả cho <strong className="text-black">{domain}</strong> — <span className="font-mono">{type}</span>
          </div>

          <div className="divide-y divide-black/5">
            {results.map((r, idx) => {
              const ips: string[] = Array.isArray(r.result?.Answer)
                ? [...new Set(r.result.Answer.map((a: DNSAnswer) => String(a.data)))]
                : []

              return (
                <div key={idx} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-black">{r.source}</div>
                    <div className="text-xs text-black/60 mt-1">{r.edns}</div>
                    {!r.ok && <div className="text-xs text-rose-600 mt-1">{r.error || 'Query failed'}</div>}
                  </div>

                  <div className="min-w-[160px] flex-shrink-0 text-right">
                    {r.ok ? (
                      ips.length > 0 ? (
                        <div className="flex flex-col items-end">
                          {ips.map((ip, i) => (
                            <span key={i} className="text-blue-600 font-mono text-sm">
                              {ip}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-black/60">Không có bản ghi</div>
                      )
                    ) : (
                      <div className="text-sm text-rose-600">{r.error || 'Query failed'}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
