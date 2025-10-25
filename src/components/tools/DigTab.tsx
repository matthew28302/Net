'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

interface DNSRecord {
  name: string
  type: string
  value: string
  ttl?: number
}

interface DigResult {
  domain: string
  recordType: string
  records: DNSRecord[]
  rawOutput: string
}

export default function DigTab() {
  const [domain, setDomain] = useState('')
  const [recordType, setRecordType] = useState('A')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DigResult | null>(null)

  const handleDig = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain to query')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/tools/dig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain, recordType }),
      })

      if (!response.ok) {
        throw new Error('DNS query failed')
      }

      const data = await response.json()
      setResult(data)
      toast.success('DNS query completed successfully')
    } catch (error) {
      console.error('Dig error:', error)
      toast.error('Failed to query DNS records')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          DNS Dig Tool
        </CardTitle>
        <CardDescription>
          Query DNS records for a domain (A, AAAA, NS, MX, TXT, CNAME, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleDig()}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="recordType">Record Type</Label>
            <Select value={recordType} onValueChange={setRecordType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="AAAA">AAAA</SelectItem>
                <SelectItem value="NS">NS</SelectItem>
                <SelectItem value="MX">MX</SelectItem>
                <SelectItem value="TXT">TXT</SelectItem>
                <SelectItem value="CNAME">CNAME</SelectItem>
                <SelectItem value="SOA">SOA</SelectItem>
                <SelectItem value="PTR">PTR</SelectItem>
                <SelectItem value="ANY">ANY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleDig} disabled={loading}>
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
        </div>

        {result && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Domain:</span>
                  <span>{result.domain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Record Type:</span>
                  <Badge variant="secondary">{result.recordType}</Badge>
                </div>
                
                {result.records.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">DNS Records:</Label>
                    <div className="mt-2 space-y-2">
                      {result.records.map((record, index) => (
                        <div key={index} className="p-3 bg-background rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{record.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.type}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground break-all">
                            {record.value}
                          </div>
                          {record.ttl && (
                            <div className="text-xs text-muted-foreground mt-1">
                              TTL: {record.ttl}s
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Label className="text-sm font-medium">Raw Output:</Label>
                  <pre className="mt-1 p-3 bg-background rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {result.rawOutput}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}