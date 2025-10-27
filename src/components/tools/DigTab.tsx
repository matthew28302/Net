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
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          style={{ flex: 1, padding: 8 }}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: 8 }}>
          {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button onClick={handleQuery} disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Đang...' : 'Query'}
        </button>
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

      {results && (
        <div style={{ display: 'grid', gap: 12 }}>
          {results.map((r, idx) => (
            <div key={idx} style={{ border: '1px solid #eee', padding: 10, borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{r.source}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{r.edns}</div>
              </div>

              {!r.ok ? (
                <div style={{ color: 'crimson' }}>{r.error || 'Query failed'}</div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {r.result?.Answer && r.result.Answer.length > 0 ? (
                    r.result.Answer.map((a: DNSAnswer, i: number) => (
                      <div key={i} style={{ background: '#fafafa', padding: 8, borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontFamily: 'monospace' }}>{a.data}</div>
                          <div style={{ fontSize: 12 }}>{a.TTL}s</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>{a.name} — type {a.type}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: '#333' }}>Không có bản ghi</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
