import React, { useState } from 'react'

type DNSAnswer = { name: string; type: number; TTL: number; data: string }
type SourceResult = { source: string; edns: string; ok: boolean; result?: any; error?: string }

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
    <div className="max-w-4xl mx-auto">
      {/* Query card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-3 items-center">
          <input
            aria-label="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 rounded-md border border-slate-200 bg-white"
          >
            {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={handleQuery}
            disabled={loading}
            className="ml-2 inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Đang...' : 'Query'}
          </button>
        </div>
        {error && <div className="text-sm text-rose-600 mt-3">{error}</div>}
      </div>

      {/* Results */}
      {results && (
        <div className="grid gap-4">
          <div className="text-sm text-slate-600 mb-1">
            Kết quả cho <strong>{domain}</strong> — <span className="font-mono">{type}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {results.map((r, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-md p-3 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium text-slate-800">{r.source}</div>
                  <div className="text-xs text-slate-500">{r.edns}</div>
                </div>

                {!r.ok ? (
                  <div className="text-sm text-rose-600">{r.error || 'Query failed'}</div>
                ) : (
                  <div className="space-y-2">
                    {r.result?.Answer && r.result.Answer.length > 0 ? (
                      r.result.Answer.map((a: DNSAnswer, i: number) => (
                        <div
                          key={i}
                          className="bg-slate-50 border border-slate-100 rounded-md p-2 text-sm"
                        >
                          <div className="flex justify-between items-center">
                            <div className="font-mono text-slate-800">{a.data}</div>
                            <div className="text-xs text-slate-600">{a.TTL}s</div>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {a.name} — type {a.type}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-600">Không có bản ghi trả về</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
