import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as dns from 'dns'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { domain, recordType = 'A' } = await request.json()

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    let records: any[] = []
    let rawOutput = ''

    // Try different methods to get DNS records
    try {
      // Method 1: Try dig command
      const { stdout } = await execAsync(`dig ${domain} ${recordType} +short`, { timeout: 10000 })
      rawOutput = stdout
      
      if (stdout.trim()) {
        const recordLines = stdout.trim().split('\n').filter(line => line.trim())
        records = recordLines.map((record, index) => ({
          name: domain,
          type: recordType,
          value: record.trim(),
          ttl: 300
        }))
      }
    } catch (digError) {
      // Method 2: Try Node.js DNS resolver
      try {
        const promises: Promise<any>[] = []
        
        switch (recordType.toUpperCase()) {
          case 'A':
            promises.push(dns.promises.resolve4(domain))
            break
          case 'AAAA':
            promises.push(dns.promises.resolve6(domain))
            break
          case 'NS':
            promises.push(dns.promises.resolveNs(domain))
            break
          case 'MX':
            promises.push(dns.promises.resolveMx(domain))
            break
          case 'TXT':
            promises.push(dns.promises.resolveTxt(domain))
            break
          case 'CNAME':
            promises.push(dns.promises.resolveCname(domain))
            break
          default:
            throw new Error(`Unsupported record type: ${recordType}`)
        }

        const results = await Promise.all(promises)
        const addresses = results.flat()
        
        if (recordType === 'MX') {
          records = addresses.map((mx: any) => ({
            name: domain,
            type: recordType,
            value: `${mx.priority} ${mx.exchange}`,
            ttl: 300
          }))
        } else if (recordType === 'TXT') {
          records = addresses.map((txtArray: string[]) => ({
            name: domain,
            type: recordType,
            value: txtArray.join(''),
            ttl: 300
          }))
        } else {
          records = addresses.map((address: string) => ({
            name: domain,
            type: recordType,
            value: address,
            ttl: 300
          }))
        }
        
        rawOutput = `Resolved using Node.js DNS resolver:\n${JSON.stringify(addresses, null, 2)}`
      } catch (dnsError) {
        throw dnsError
      }
    }

    return NextResponse.json({
      domain,
      recordType,
      records,
      rawOutput
    })

  } catch (error) {
    console.error('Dig error:', error)
    
    return NextResponse.json({
      domain: request.body?.domain || 'unknown',
      recordType: request.body?.recordType || 'A',
      records: [],
      rawOutput: error instanceof Error ? error.message : 'DNS query failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}