'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, List, Network, Search, Shield, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface BulkCheckItem {
  host: string
  ping?: {
    status: 'online' | 'offline' | 'error'
    responseTime?: number
    error?: string
  }
  dig?: {
    a?: {
      status: 'success' | 'error'
      records?: string[]
      error?: string
    }
    ns?: {
      status: 'success' | 'error'
      records?: string[]
      error?: string
    }
  }
  ssl?: {
    status: 'valid' | 'expired' | 'error' | 'none'
    issuer?: string
    expiresAt?: string
    daysRemaining?: number
    error?: string
  }
}

interface BulkCheckResult {
  total: number
  completed: number
  processingTime?: number
  items: BulkCheckItem[]
}

export default function BulkCheckTab() {
  const [hosts, setHosts] = useState('')
  const [checkPing, setCheckPing] = useState(true)
  const [checkDig, setCheckDig] = useState(true)
  const [checkSSL, setCheckSSL] = useState(true)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BulkCheckResult | null>(null)

  // Debounced progress update
  const updateProgress = useCallback((value: number) => {
    setProgress(value)
  }, [])

  const handleBulkCheck = useCallback(async () => {
    const hostList = hosts
      .split('\n')
      .map(host => host.trim())
      .filter(host => host.length > 0)

    if (hostList.length === 0) {
      toast.error('Please enter at least one host to check')
      return
    }

    if (!checkPing && !checkDig && !checkSSL) {
      toast.error('Please select at least one check type')
      return
    }

    setLoading(true)
    setProgress(0)
    setResult(null)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/tools/bulk-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hosts: hostList,
          checks: {
            ping: checkPing,
            dig: checkDig,
            ssl: checkSSL,
          },
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        throw new Error('Bulk check failed')
      }

      const data = await response.json()
      setResult(data)
      
      const successCount = data.items.filter(item => {
        if (checkPing && item.ping?.status === 'online') return true
        if (checkDig && (item.dig?.a?.status === 'success' || item.dig?.ns?.status === 'success')) return true
        if (checkSSL && item.ssl?.status === 'valid') return true
        return false
      }).length

      toast.success(`Bulk check completed! ${successCount}/${data.total} hosts passed`)

    } catch (error) {
      console.error('Bulk check error:', error)
      toast.error('Failed to perform bulk check')
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }, [hosts, checkPing, checkDig, checkSSL, updateProgress])

  // Memoized statistics
  const stats = useMemo(() => {
    if (!result) return null

    const passed = result.items.filter(item => {
      if (checkPing && item.ping?.status === 'online') return true
      if (checkDig && (item.dig?.a?.status === 'success' || item.dig?.ns?.status === 'success')) return true
      if (checkSSL && item.ssl?.status === 'valid') return true
      return false
    }).length

    const failed = result.items.filter(item => {
      if (checkPing && item.ping?.status === 'offline') return true
      if (checkDig && (item.dig?.a?.status === 'error' || item.dig?.ns?.status === 'error')) return true
      if (checkSSL && (item.ssl?.status === 'expired' || item.ssl?.status === 'error')) return true
      return false
    }).length

    return { passed, failed }
  }, [result, checkPing, checkDig, checkSSL])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'success':
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'offline':
      case 'error':
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'none':
        return <XCircle className="h-4 w-4 text-gray-400" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      online: 'default',
      success: 'default',
      valid: 'default',
      offline: 'destructive',
      error: 'destructive',
      expired: 'destructive',
      none: 'secondary',
    }
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="text-xs">
        {status}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5" />
          Bulk Network Check
        </CardTitle>
        <CardDescription>
          Check multiple hosts for ping, DNS records, and SSL certificates simultaneously
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="hosts">Hosts (one per line)</Label>
              <Textarea
                id="hosts"
                placeholder="example.com
google.com
github.com
8.8.8.8"
                value={hosts}
                onChange={(e) => setHosts(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Check Types:</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="checkPing"
                    checked={checkPing}
                    onCheckedChange={(checked) => setCheckPing(checked as boolean)}
                  />
                  <Label htmlFor="checkPing" className="flex items-center gap-2 text-sm">
                    <Network className="h-4 w-4" />
                    Ping Test
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="checkDig"
                    checked={checkDig}
                    onCheckedChange={(checked) => setCheckDig(checked as boolean)}
                  />
                  <Label htmlFor="checkDig" className="flex items-center gap-2 text-sm">
                    <Search className="h-4 w-4" />
                    DNS Records (A & NS)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="checkSSL"
                    checked={checkSSL}
                    onCheckedChange={(checked) => setCheckSSL(checked as boolean)}
                  />
                  <Label htmlFor="checkSSL" className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4" />
                    SSL Certificate
                  </Label>
                </div>
              </div>
            </div>

            <Button onClick={handleBulkCheck} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Start Bulk Check
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {loading && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Processing hosts...</span>
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {result && stats && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{result.total}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {stats.passed}
                        </div>
                        <div className="text-sm text-muted-foreground">Passed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {stats.failed}
                        </div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                    </div>
                    {result.processingTime && (
                      <div className="text-center text-sm text-muted-foreground">
                        Completed in {result.processingTime}ms
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {result.items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{item.host}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {checkPing && item.ping && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Network className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Ping</span>
                              {getStatusIcon(item.ping.status)}
                            </div>
                            {getStatusBadge(item.ping.status)}
                            {item.ping.responseTime && (
                              <div className="text-xs text-muted-foreground">
                                {item.ping.responseTime}ms
                              </div>
                            )}
                            {item.ping.error && (
                              <div className="text-xs text-red-600">
                                {item.ping.error}
                              </div>
                            )}
                          </div>
                        )}

                        {checkDig && item.dig && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Search className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">DNS</span>
                            </div>
                            {item.dig.a && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">A:</span>
                                  {getStatusIcon(item.dig.a.status)}
                                </div>
                                {item.dig.a.records && item.dig.a.records.length > 0 && (
                                  <div className="text-xs text-muted-foreground break-all">
                                    {item.dig.a.records[0]}
                                  </div>
                                )}
                              </div>
                            )}
                            {item.dig.ns && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">NS:</span>
                                  {getStatusIcon(item.dig.ns.status)}
                                </div>
                                {item.dig.ns.records && item.dig.ns.records.length > 0 && (
                                  <div className="text-xs text-muted-foreground break-all">
                                    {item.dig.ns.records[0]}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {checkSSL && item.ssl && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">SSL</span>
                              {getStatusIcon(item.ssl.status)}
                            </div>
                            {getStatusBadge(item.ssl.status)}
                            {item.ssl.issuer && (
                              <div className="text-xs text-muted-foreground">
                                {item.ssl.issuer}
                              </div>
                            )}
                            {item.ssl.daysRemaining !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                {item.ssl.daysRemaining} days left
                              </div>
                            )}
                            {item.ssl.error && (
                              <div className="text-xs text-red-600">
                                {item.ssl.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}