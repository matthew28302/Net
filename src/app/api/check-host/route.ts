import { NextRequest, NextResponse } from 'next/server'
import * as dns from 'dns'

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

export async function POST(request: NextRequest) {
  try {
    const { host } = await request.json()

    if (!host) {
      return NextResponse.json(
        { error: 'Host is required' },
        { status: 400 }
      )
    }

    // Step 1: Resolve hostname to IP if needed
    let targetIp = host
    let hostname = ''

    // Check if input is a domain name (not an IP address)
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (!ipRegex.test(host)) {
      try {
        const { address } = await dns.promises.lookup(host, { family: 4 })
        targetIp = address
        hostname = host
      } catch (dnsError) {
        return NextResponse.json(
          { error: 'Could not resolve hostname' },
          { status: 400 }
        )
      }
    } else {
      // If input is an IP, try to get reverse DNS
      try {
        const hostnames = await dns.promises.reverse(targetIp)
        if (hostnames.length > 0) {
          hostname = hostnames[0]
        }
      } catch (reverseError) {
        // Ignore reverse DNS errors
      }
    }

    // Step 2: Get IP geolocation information
    const ipInfo = await getIpInfo(targetIp)

    // Step 3: Try to get hostname via reverse DNS if not already found
    if (!ipInfo.hostname) {
      ipInfo.hostname = hostname
    }

    return NextResponse.json(ipInfo)

  } catch (error) {
    console.error('IP info lookup error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get IP information' },
      { status: 500 }
    )
  }
}

async function getIpInfo(ip: string): Promise<HostInfo> {
  try {
    // Use ip-api.com (free, no API key required)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`IP API responded with status: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'success') {
      throw new Error(`IP API error: ${data.message || 'Unknown error'}`)
    }

    // Parse ASN information
    let asnInfo = {
      asn: 'N/A',
      name: data.isp || 'N/A',
      route: `${data.query}/24`,
      type: 'ISP'
    }

    if (data.as) {
      const asnMatch = data.as.match(/AS(\d+)\s+(.+)/)
      if (asnMatch) {
        asnInfo = {
          asn: `AS${asnMatch[1]}`,
          name: asnMatch[2],
          route: `${data.query}/24`,
          type: 'ISP'
        }
      }
    }

    // Format location string
    const locationParts = []
    if (data.city) locationParts.push(data.city)
    if (data.regionName) locationParts.push(data.regionName)
    if (data.country) locationParts.push(data.country)
    const locationString = locationParts.join(', ') || 'Unknown'

    return {
      ip: data.query || ip,
      hostname: '', // ip-api doesn't provide hostname
      isp: data.isp || 'Unknown',
      org: data.org || '',
      country: data.country || 'Unknown',
      countryCode: data.countryCode || 'XX',
      region: data.regionName || 'Unknown',
      city: data.city || 'Unknown',
      latitude: data.lat || 0,
      longitude: data.lon || 0,
      timezone: data.timezone || 'UTC',
      asn: asnInfo,
      location: locationString
    }
  } catch (error) {
    console.error('Error fetching IP info:', error)
    
    // Fallback to basic information
    return {
      ip,
      hostname: '',
      isp: 'Unknown',
      org: 'Unknown',
      country: 'Unknown',
      countryCode: 'XX',
      region: 'Unknown',
      city: 'Unknown',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      asn: {
        asn: 'N/A',
        name: 'N/A',
        route: 'N/A',
        type: 'N/A'
      },
      location: 'Unknown'
    }
  }
}