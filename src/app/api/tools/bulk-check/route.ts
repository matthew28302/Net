import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as dns from 'dns'
import * as tls from 'tls'
import { createConnection } from 'net'

const execAsync = promisify(exec)

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedResult(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCachedResult(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function POST(request: NextRequest) {
  try {
    const { hosts, checks } = await request.json()

    if (!hosts || !Array.isArray(hosts) || hosts.length === 0) {
      return NextResponse.json(
        { error: 'Hosts array is required' },
        { status: 400 }
      )
    }

    const results = []
    const startTime = Date.now()

    // Process hosts in parallel with concurrency limit
    const concurrencyLimit = 5
    const chunks = []
    
    for (let i = 0; i < hosts.length; i += concurrencyLimit) {
      chunks.push(hosts.slice(i, i + concurrencyLimit))
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (host: string) => {
        const trimmedHost = host.trim()
        if (!trimmedHost) return null

        const result: any = { host: trimmedHost }

        try {
          // Ping check
          if (checks.ping) {
            const cacheKey = `ping:${trimmedHost}`
            const cached = getCachedResult(cacheKey)
            
            if (cached) {
              result.ping = cached
            } else {
              try {
                const tcpTest = await testTcpConnection(trimmedHost, 80)
                result.ping = {
                  status: tcpTest.success ? 'online' : 'offline',
                  responseTime: tcpTest.time
                }
                setCachedResult(cacheKey, result.ping)
              } catch (pingError) {
                result.ping = {
                  status: 'error',
                  error: pingError instanceof Error ? pingError.message : 'Ping failed'
                }
              }
            }
          }

          // DNS check
          if (checks.dig) {
            result.dig = {}

            // A record check
            try {
              const cacheKey = `a:${trimmedHost}`
              const cached = getCachedResult(cacheKey)
              
              if (cached) {
                result.dig.a = cached
              } else {
                const aRecords = await dns.promises.resolve4(trimmedHost)
                result.dig.a = {
                  status: 'success',
                  records: aRecords
                }
                setCachedResult(cacheKey, result.dig.a)
              }
            } catch (aError) {
              result.dig.a = {
                status: 'error',
                error: aError instanceof Error ? aError.message : 'A record lookup failed'
              }
            }

            // NS record check
            try {
              const cacheKey = `ns:${trimmedHost}`
              const cached = getCachedResult(cacheKey)
              
              if (cached) {
                result.dig.ns = cached
              } else {
                const nsRecords = await dns.promises.resolveNs(trimmedHost)
                result.dig.ns = {
                  status: 'success',
                  records: nsRecords
                }
                setCachedResult(cacheKey, result.dig.ns)
              }
            } catch (nsError) {
              result.dig.ns = {
                status: 'error',
                error: nsError instanceof Error ? nsError.message : 'NS record lookup failed'
              }
            }
          }

          // SSL check
          if (checks.ssl) {
            const cacheKey = `ssl:${trimmedHost}`
            const cached = getCachedResult(cacheKey)
            
            if (cached) {
              result.ssl = cached
            } else {
              try {
                const socket = tls.connect({
                  host: trimmedHost,
                  port: 443,
                  servername: trimmedHost,
                  rejectUnauthorized: false
                })

                const certificate = await new Promise((resolve, reject) => {
                  socket.on('secureConnect', () => {
                    const cert = socket.getPeerCertificate(true)
                    socket.destroy()
                    resolve(cert)
                  })

                  socket.on('error', (error) => {
                    socket.destroy()
                    reject(error)
                  })

                  socket.setTimeout(3000, () => {
                    socket.destroy()
                    reject(new Error('Connection timeout'))
                  })
                })

                if (certificate && typeof certificate === 'object' && 'valid_to' in certificate) {
                  const expiryDate = new Date(certificate.valid_to as string)
                  const daysRemaining = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  
                  result.ssl = {
                    status: daysRemaining > 0 ? 'valid' : 'expired',
                    issuer: safeGet(certificate, 'issuer.CN') || safeGet(certificate, 'issuer.O') || 'Unknown',
                    expiresAt: expiryDate.toISOString(),
                    daysRemaining
                  }
                } else {
                  result.ssl = {
                    status: 'none',
                    error: 'No SSL certificate found'
                  }
                }
                setCachedResult(cacheKey, result.ssl)
              } catch (sslError) {
                result.ssl = {
                  status: 'error',
                  error: sslError instanceof Error ? sslError.message : 'SSL check failed'
                }
              }
            }
          }

        } catch (error) {
          // General error for this host
          if (checks.ping && !result.ping) {
            result.ping = {
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
          if (checks.dig && !result.dig) {
            result.dig = {
              a: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
              ns: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            }
          }
          if (checks.ssl && !result.ssl) {
            result.ssl = {
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        }

        return result
      })

      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults.filter(r => r !== null))
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      total: hosts.length,
      completed: results.length,
      processingTime: totalTime,
      items: results
    })

  } catch (error) {
    console.error('Bulk check error:', error)
    
    return NextResponse.json({
      total: 0,
      completed: 0,
      processingTime: 0,
      items: [],
      error: error instanceof Error ? error.message : 'Bulk check failed'
    })
  }
}

function safeGet(obj: any, path: string, defaultValue: any = undefined): any {
  try {
    return path.split('.').reduce((current, key) => current && current[key], obj) || defaultValue
  } catch (error) {
    return defaultValue
  }
}

async function testTcpConnection(host: string, port: number): Promise<{ success: boolean; time: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    const socket = createConnection(port, host)
    
    socket.setTimeout(3000) // Reduced timeout for better performance
    
    socket.on('connect', () => {
      const time = Date.now() - startTime
      socket.destroy()
      resolve({ success: true, time })
    })
    
    socket.on('timeout', () => {
      const time = Date.now() - startTime
      socket.destroy()
      resolve({ success: false, time })
    })
    
    socket.on('error', () => {
      const time = Date.now() - startTime
      resolve({ success: false, time })
    })
  })
}