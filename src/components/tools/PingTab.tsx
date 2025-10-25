'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Network } from 'lucide-react'
import { toast } from 'sonner'

interface PingResult {
  host: string
  alive: boolean
  output: string
  time?: number
  packets?: {
    transmitted: number
    received: number
    loss: number
  }
}

export default function PingTab() {
  const [host, setHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PingResult | null>(null)

  const handlePing = async () => {
    if (!host.trim()) {
      toast.error('Please enter a host to ping')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/tools/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host }),
      })

      if (!response.ok) {
        throw new Error('Ping request failed')
      }

      const data = await response.json()
      setResult(data)
      toast.success('Ping completed successfully')
    } catch (error) {
      console.error('Ping error:', error)
      toast.error('Failed to ping host')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Ping Tool
        </CardTitle>
        <CardDescription>
          Test network connectivity to a host by sending ICMP echo requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="host">Host/IP Address</Label>
            <Input
              id="host"
              placeholder="example.com or 8.8.8.8"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePing()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handlePing} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pinging...
                </>
              ) : (
                'Ping'
              )}
            </Button>
          </div>
        </div>

        {result && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Host:</span>
                  <span>{result.host}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant={result.alive ? 'default' : 'destructive'}>
                    {result.alive ? 'Online' : 'Offline'}
                  </Badge>
                </div>
                {result.time && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Response Time:</span>
                    <span>{result.time}ms</span>
                  </div>
                )}
                {result.packets && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Packets:</span>
                      <span>
                        {result.packets.transmitted} sent, {result.packets.received} received
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Packet Loss:</span>
                      <span>{result.packets.loss}%</span>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <Label className="text-sm font-medium">Raw Output:</Label>
                  <pre className="mt-1 p-3 bg-background rounded text-xs overflow-x-auto whitespace-pre-wrap">
                    {result.output}
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