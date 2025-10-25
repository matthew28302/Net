'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Globe, MapPin, Building, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface HostInfo {
  ip: string
  hostname: string
  isp: string
  org: string
  country: string
  countryCode: string
  region: string
  city: string
  latitude: number
  longitude: number
  timezone: string
  asn: {
    asn: string
    name: string
    route: string
    type: string
  }
  location: string
}

export default function CheckHostTab() {
  const [host, setHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HostInfo | null>(null)
  const [error, setError] = useState('')

  const getCountryFlag = (countryCode: string) => {
    const flags: Record<string, string> = {
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'JP': '🇯🇵',
      'CN': '🇨🇳',
      'VN': '🇻🇳',
      'SG': '🇸🇬',
      'AU': '🇦🇺',
      'CA': '🇨🇦',
      'IN': '🇮🇳',
      'BR': '🇧🇷',
      'RU': '🇷🇺',
      'KR': '🇰🇷',
      'IT': '🇮🇹',
      'ES': '🇪🇸',
      'NL': '🇳🇱',
      'CH': '🇨🇭',
      'SE': '🇸🇪',
      'NO': '🇳🇴',
      'DK': '🇩🇰',
      'FI': '🇫🇮',
      'PL': '🇵🇱',
      'CZ': '🇨🇿',
      'AT': '🇦🇹',
      'BE': '🇧🇪',
      'IE': '🇮🇪',
      'PT': '🇵🇹',
      'GR': '🇬🇷',
      'TR': '🇹🇷',
      'IL': '🇮🇱',
      'SA': '🇸🇦',
      'AE': '🇦🇪',
      'EG': '🇪🇬',
      'ZA': '🇿🇦',
      'MX': '🇲🇽',
      'AR': '🇦🇷',
      'CO': '🇨🇴',
      'CL': '🇨🇱',
      'PE': '🇵🇪',
      'TH': '🇹🇭',
      'MY': '🇲🇾',
      'ID': '🇮🇩',
      'PH': '🇵🇭',
      'HK': '🇭🇰',
      'TW': '🇹🇼',
      'NZ': '🇳🇿',
    }
    return flags[countryCode] || '🌍'
  }

  const handleCheck = async () => {
    if (!host.trim()) {
      setError('Please enter a hostname or IP address')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/check-host', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host }),
      })

      if (!response.ok) {
        throw new Error('Failed to check host information')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheck()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          IP and website location: {host || 'example.com'}
        </CardTitle>
        <CardDescription>
          Get detailed information about IP address and hostname including ISP, location, and network details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter hostname or IP address (e.g., example.com or 8.8.8.8)"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleCheck} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Looking up...
              </>
            ) : (
              'Lookup'
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IP Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    IP address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{result.ip}</div>
                </CardContent>
              </Card>

              {/* Hostname */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Host name
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-mono break-all">{result.hostname}</div>
                </CardContent>
              </Card>

              {/* ISP/Organization */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    ISP / Org
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="font-medium">{result.isp}</div>
                    {result.org && result.org !== result.isp && (
                      <div className="text-sm text-muted-foreground">{result.org}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Country */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Country
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCountryFlag(result.countryCode)}</span>
                    <div>
                      <div className="font-medium">{result.country}</div>
                      <div className="text-sm text-muted-foreground">{result.countryCode}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="font-medium">{result.location}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ASN */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    ASN
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="font-medium">{result.asn.asn}</div>
                    <div className="text-sm text-muted-foreground">{result.asn.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{result.asn.route}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Timezone */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timezone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="font-medium">{result.timezone}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Network Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Region:</span> {result.region}
                  </div>
                  <div>
                    <span className="font-medium">City:</span> {result.city}
                  </div>
                  <div>
                    <span className="font-medium">ASN Type:</span> {result.asn.type}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}