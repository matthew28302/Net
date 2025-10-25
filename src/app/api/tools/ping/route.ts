import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as dns from 'dns'
import { createConnection } from 'net'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { host } = await request.json()

    if (!host) {
      return NextResponse.json(
        { error: 'Host is required' },
        { status: 400 }
      )
    }

    let output = ''
    let alive = false
    let time: number | undefined
    let packets: { transmitted: number; received: number; loss: number } | undefined

    try {
      // First try to resolve the hostname
      const startTime = Date.now()
      await dns.promises.lookup(host)
      const resolveTime = Date.now() - startTime

      // Try different ping approaches based on the system
      const isWindows = process.platform === 'win32'
      
      try {
        // Try standard ping first
        const pingCommand = isWindows 
          ? `ping -n 2 ${host}`
          : `ping -c 2 ${host}`

        const { stdout, stderr } = await execAsync(pingCommand, {
          timeout: 10000,
        })

        output = stdout || stderr
        alive = !output.includes('100% packet loss') && 
                !output.includes('Request timed out') &&
                !output.includes('Destination host unreachable') &&
                !output.includes('Operation not permitted')

        // Extract timing information
        const timeMatch = output.match(/time[=<](\d+\.?\d*)\s*ms/i)
        if (timeMatch) {
          time = parseFloat(timeMatch[1])
        } else {
          time = resolveTime // Use DNS resolution time as fallback
        }

        // Extract packet statistics
        const packetMatch = output.match(/(\d+)\s+packets transmitted,\s+(\d+)\s+received,\s+(\d+)%/i)
        if (packetMatch) {
          packets = {
            transmitted: parseInt(packetMatch[1]),
            received: parseInt(packetMatch[2]),
            loss: parseInt(packetMatch[3])
          }
        }

      } catch (pingError) {
        // If ping fails due to permissions, try alternative methods
        if (pingError instanceof Error && pingError.message.includes('Operation not permitted')) {
          // Use TCP connection test as alternative to ping
          try {
            const tcpTest = await testTcpConnection(host, 80)
            alive = tcpTest.success
            time = tcpTest.time
            output = `TCP connection test to ${host}:80\n${tcpTest.success ? 'Success' : 'Failed'} (${tcpTest.time}ms)`
            packets = {
              transmitted: 1,
              received: tcpTest.success ? 1 : 0,
              loss: tcpTest.success ? 0 : 100
            }
          } catch (tcpError) {
            output = `Ping not available (permission denied)\nTCP connection test failed\n${tcpError instanceof Error ? tcpError.message : 'Unknown error'}`
            alive = false
            time = undefined
            packets = {
              transmitted: 1,
              received: 0,
              loss: 100
            }
          }
        } else {
          throw pingError
        }
      }

    } catch (error) {
      // DNS resolution failed
      output = `Host resolution failed\n${error instanceof Error ? error.message : 'Unknown error'}`
      alive = false
      time = undefined
      packets = {
        transmitted: 1,
        received: 0,
        loss: 100
      }
    }

    return NextResponse.json({
      host,
      alive,
      output,
      time,
      packets
    })

  } catch (error) {
    console.error('Ping error:', error)
    
    return NextResponse.json({
      host: request.body?.host || 'unknown',
      alive: false,
      output: error instanceof Error ? error.message : 'Ping failed',
      error: error instanceof Error ? error.message : 'Unknown error'
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