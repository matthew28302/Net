import React, { useState } from 'react'

type DNSAnswer = { name: string; type: number; TTL: number; data: string }
type SourceResult = { source: string; edns: string; ok: boolean; result?: any; error?: string }

/**
 * Cập nhật:
 * - Tông màu đen-trắng (monochrome)
 * - Thêm khoảng cách trên (mt-20) để khung tìm kiếm không bị che bởi navbar cố định
 * - Kết quả: mỗi nguồn xếp hàng (1 bên server, 1 bên IP); IP màu xanh dương
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
    <div className="max-w-4xl mx-auto mt-20 px-4"> {/* mt-20 tránh bị navbar che */}
      {/* Query card - monochrome */}
      <div className="bg-white border border-black/10 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-3 items-center">
          <input
            aria-label="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-4 py-3 rounded-md border border-black/10 bg-white text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-4 py-3 rounded-md border border-black/10 bg-white text-black"
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
            className="ml-2 inline-flex items-center px-4 py-3 border border-black/20 bg-black text-white rounded-md hover:bg-black/90 disabled:opacity-60"
          >
            {loading ? 'Đang...' : 'Query'}
          </button>
        </div>
        {error && <div className="text-sm text-rose-600 mt-3">{error}</div>}
      </div>

      {/* Results header */}
      {results && (
        <div className="bg-white border border-black/10 rounded-md p-4 shadow-sm">
          <div className="text-sm text-black/70 mb-3">
            Kết quả cho <strong className="text-black">{domain}</strong> — <span className="font-mono">{type}</span>
          </div>

          {/* Results list: mỗi nguồn 1 hàng, trái = server, phải = IPs (màu xanh) */}
          <div className="divide-y divide-black/5">
            {results.map((r, idx) => {
              // thu thập danh sách "IP" hiển thị từ Answer[].data
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
                        // hiển thị mỗi IP trên 1 dòng, màu xanh dương
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
