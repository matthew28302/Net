'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Search } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuery()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          DNS Lookup: {domain || 'example.com'}
        </CardTitle>
        <CardDescription>
          Query DNS records for a domain, including A, AAAA, CNAME, MX, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter domain (e.g., example.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button onClick={handleQuery} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Querying...
              </>
            ) : (
              'Query'
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Kết quả cho <strong>{domain}</strong> — <span className="font-mono">{type}</span>
            </div>
            <div className="space-y-3">
              {results.map((r, idx) => {
                const ips: string[] = Array.isArray(r.result?.Answer)
                  ? [...new Set(r.result.Answer.map((a: DNSAnswer) => String(a.data)))]
                  : []

                return (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{r.source}</div>
                          <div className="text-xs text-muted-foreground mt-1">{r.edns}</div>
                          {!r.ok && <div className="text-xs text-destructive mt-1">{r.error || 'Query failed'}</div>}
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
                              <div className="text-sm text-muted-foreground">Không có bản ghi</div>
                            )
                          ) : (
                            <div className="text-sm text-destructive">{r.error || 'Query failed'}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
