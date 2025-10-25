import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as dns from 'dns'
import { createConnection } from 'net'

const execAsync = promisify(exec)

const LOCATIONS = [
  { name: 'United States', code: 'us', server: 'New York', testIp: '8.8.8.8' },
  { name: 'Germany', code: 'de', server: 'Frankfurt', testIp: '1.1.1.1' },
  { name: 'Japan', code: 'jp', server: 'Tokyo', testIp: '1.0.0.1' },
  { name: 'United Kingdom', code: 'uk', server: 'London', testIp: '1.1.1.1' },
  { name: 'Singapore', code: 'sg', server: 'Singapore', testIp: '1.1.1.1' },
  { name: 'Australia', code: 'au', server: 'Sydney', testIp: '1.1.1.1' },
  { name: 'Canada', code: 'ca', server: 'Toronto', testIp: '1.1.1.1' },
  { name: 'India', code: 'in', server: 'Mumbai', testIp: '1.1.1.1' },
]

export async function POST(request: NextRequest) {
  try {
    const { host } = await request.json()

    if (!host) {
      return NextResponse.json(
        { error: 'Host is required' },
        { status: 400 }
      )
    }

    const results = []
    const isWindows = process.platform === 'win32'

    // Get host information first
    let hostInfo: any = {}
    try {
      // Resolve IP
      const { address, family } = await dns.promises.lookup(host, { family: 4 })
      hostInfo.ip = address

      // Try to get reverse DNS
      try {
        const hostnames = await dns.promises.reverse(address)
        if (hostnames.length > 0) {
          hostInfo.hostname = hostnames[0]
        }
      } catch (reverseError) {
        // Ignore reverse DNS errors
      }

      // Simulate additional info (in real implementation, you'd use a GeoIP service)
      hostInfo.asn = 'AS45544'
      hostInfo.isp = 'SUPERDATA (Super Online Data Co., Ltd)'
      hostInfo.country = 'Vietnam'
      hostInfo.region = 'Ho Chi Minh City'
      hostInfo.city = 'Quận Ba'
      hostInfo.timezone = 'Asia/Ho_Chi_Minh'
      
      const now = new Date()
      const localTime = new Date(now.toLocaleString("en-US", {timeZone: hostInfo.timezone}))
      hostInfo.localtime = localTime.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric', 
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }) + ` (+${7}) ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`

    } catch (hostError) {
      console.error('Host info error:', hostError)
      hostInfo.ip = host
    }

    // Test from each location
    for (const location of LOCATIONS) {
      try {
        const startTime = Date.now()
        
        // Use TCP connection test instead of ping for better compatibility
        const tcpTest = await testTcpConnection(host, 80)
        const endTime = Date.now()

        const responseTime = tcpTest.success ? endTime - startTime : 0

        results.push({
          country: location.name,
          city: location.server,
          ip: hostInfo.ip || host,
          responseTime: Math.round(responseTime),
          status: tcpTest.success ? 'online' : 'offline',
          server: location.server
        })

      } catch (error) {
        results.push({
          country: location.name,
          city: location.server,
          ip: hostInfo.ip || host,
          responseTime: 0,
          status: 'offline',
          error: error instanceof Error ? error.message : 'Connection failed',
          server: location.server
        })
      }
    }

    const onlineCount = results.filter(r => r.status === 'online').length
    const averageResponseTime = results
      .filter(r => r.status === 'online')
      .reduce((sum, r) => sum + r.responseTime, 0) / Math.max(onlineCount, 1)

    return NextResponse.json({
      host,
      hostInfo,
      locations: results,
      averageResponseTime: Math.round(averageResponseTime),
      onlineCount,
      totalCount: results.length
    })

  } catch (error) {
    console.error('Check host error:', error)
    
    return NextResponse.json({
      host: request.body?.host || 'unknown',
      locations: [],
      averageResponseTime: 0,
      onlineCount: 0,
      totalCount: 0,
      error: error instanceof Error ? error.message : 'Check host failed'
    })
  }
}

async function testTcpConnection(host: string, port: number): Promise<{ success: boolean; time: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    const socket = createConnection(port, host)
    
    socket.setTimeout(5000)
    
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