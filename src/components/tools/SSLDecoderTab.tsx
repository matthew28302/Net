'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Shield, Calendar, User, Key } from 'lucide-react'
import { toast } from 'sonner'

interface CertificateInfo {
  version: number
  serialNumber: string
  signatureAlgorithm: string
  issuer: {
    commonName?: string
    organization?: string
    organizationalUnit?: string
    country?: string
    state?: string
    locality?: string
    email?: string
  }
  subject: {
    commonName?: string
    organization?: string
    organizationalUnit?: string
    country?: string
    state?: string
    locality?: string
    email?: string
  }
  validity: {
    notBefore: string
    notAfter: string
    isValid: boolean
    daysRemaining?: number
  }
  extensions?: {
    subjectAlternativeNames?: string[]
    keyUsage?: string[]
    extendedKeyUsage?: string[]
  }
  publicKey?: {
    algorithm: string
    keySize?: number
  }
}

interface SSLResult {
  type: 'certificate' | 'csr'
  input: string
  info: CertificateInfo
  rawText: string
}

export default function SSLDecoderTab() {
  const [input, setInput] = useState('')
  const [type, setType] = useState<'certificate' | 'csr'>('certificate')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SSLResult | null>(null)
  const [activeTab, setActiveTab] = useState('input')

  const handleDecode = async () => {
    if (!input.trim()) {
      toast.error('Please enter a certificate or CSR to decode')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/tools/ssl-decoder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, type }),
      })

      if (!response.ok) {
        throw new Error('SSL decode failed')
      }

      const data = await response.json()
      setResult(data)
      setActiveTab('result')
      toast.success(`${type === 'certificate' ? 'Certificate' : 'CSR'} decoded successfully`)
    } catch (error) {
      console.error('SSL decode error:', error)
      toast.error('Failed to decode SSL certificate/CSR')
    } finally {
      setLoading(false)
    }
  }

  const handleURLDecode = async () => {
    if (!input.trim()) {
      toast.error('Please enter a URL to check SSL certificate')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/tools/ssl-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: input }),
      })

      if (!response.ok) {
        throw new Error('SSL check failed')
      }

      const data = await response.json()
      setResult(data)
      setActiveTab('result')
      toast.success('SSL certificate retrieved successfully')
    } catch (error) {
      console.error('SSL check error:', error)
      toast.error('Failed to retrieve SSL certificate')
    } finally {
      setLoading(false)
    }
  }

  const renderCertificateInfo = (info: CertificateInfo) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.subject.commonName && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Common Name:</span>
                <span className="text-sm">{info.subject.commonName}</span>
              </div>
            )}
            {info.subject.organization && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Organization:</span>
                <span className="text-sm">{info.subject.organization}</span>
              </div>
            )}
            {info.subject.organizationalUnit && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Organizational Unit:</span>
                <span className="text-sm">{info.subject.organizationalUnit}</span>
              </div>
            )}
            {info.subject.country && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Country:</span>
                <span className="text-sm">{info.subject.country}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Issuer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.issuer.commonName && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Common Name:</span>
                <span className="text-sm">{info.issuer.commonName}</span>
              </div>
            )}
            {info.issuer.organization && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Organization:</span>
                <span className="text-sm">{info.issuer.organization}</span>
              </div>
            )}
            {info.issuer.organizationalUnit && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Organizational Unit:</span>
                <span className="text-sm">{info.issuer.organizationalUnit}</span>
              </div>
            )}
            {info.issuer.country && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Country:</span>
                <span className="text-sm">{info.issuer.country}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Validity Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={info.validity.isValid ? 'default' : 'destructive'}>
              {info.validity.isValid ? 'Valid' : 'Expired'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Not Before:</span>
            <span className="text-sm">{new Date(info.validity.notBefore).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Not After:</span>
            <span className="text-sm">{new Date(info.validity.notAfter).toLocaleString()}</span>
          </div>
          {info.validity.daysRemaining !== undefined && (
            <div className="flex justify-between">
              <span className="text-sm font-medium">Days Remaining:</span>
              <span className={`text-sm font-medium ${
                info.validity.daysRemaining < 30 ? 'text-red-600' : 
                info.validity.daysRemaining < 60 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {info.validity.daysRemaining} days
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {info.publicKey && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-4 w-4" />
              Public Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Algorithm:</span>
              <span className="text-sm">{info.publicKey.algorithm}</span>
            </div>
            {info.publicKey.keySize && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Key Size:</span>
                <span className="text-sm">{info.publicKey.keySize} bits</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {info.extensions?.subjectAlternativeNames && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Subject Alternative Names</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {info.extensions.subjectAlternativeNames.map((san, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {san}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          SSL Certificate Decoder
        </CardTitle>
        <CardDescription>
          Decode SSL certificates and CSRs, or check SSL certificates from URLs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="url" disabled={result !== null}>From URL</TabsTrigger>
            <TabsTrigger value="result" disabled={result === null}>Result</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value: 'certificate' | 'csr') => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">X.509 Certificate</SelectItem>
                    <SelectItem value="csr">Certificate Signing Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="input">
                  {type === 'certificate' ? 'Certificate' : 'CSR'} (PEM format)
                </Label>
                <Textarea
                  id="input"
                  placeholder={`-----BEGIN ${type === 'certificate' ? 'CERTIFICATE' : 'CERTIFICATE REQUEST'}-----
...
-----END ${type === 'certificate' ? 'CERTIFICATE' : 'CERTIFICATE REQUEST'}-----`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
              </div>
              <Button onClick={handleDecode} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Decoding...
                  </>
                ) : (
                  'Decode'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleURLDecode()}
                />
              </div>
              <Button onClick={handleURLDecode} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check SSL Certificate'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="result" className="mt-4">
            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {result.type === 'certificate' ? 'X.509 Certificate' : 'Certificate Signing Request'}
                  </Badge>
                </div>
                {renderCertificateInfo(result.info)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}