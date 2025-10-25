import { NextRequest, NextResponse } from 'next/server'
import * as tls from 'tls'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    let hostname: string
    let port = 443

    try {
      const parsedUrl = new URL(url)
      hostname = parsedUrl.hostname
      port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80)
    } catch (urlError) {
      // If it's not a full URL, treat it as a hostname
      hostname = url
    }

    // Get SSL certificate
    const socket = tls.connect({
      host: hostname,
      port: port,
      servername: hostname,
      rejectUnauthorized: false // Don't reject self-signed certs
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

      socket.setTimeout(10000, () => {
        socket.destroy()
        reject(new Error('Connection timeout'))
      })
    })

    if (!certificate) {
      throw new Error('No certificate found')
    }

    // Parse certificate information directly from the TLS certificate object
    const parseCertificateInfo = (cert: any) => {
      // Helper function to safely get certificate field
      const safeGet = (obj: any, field: string, defaultValue: any = undefined) => {
        try {
          return obj && obj[field] !== undefined ? obj[field] : defaultValue
        } catch (error) {
          return defaultValue
        }
      }

      const parseDN = (dn: any) => ({
        commonName: safeGet(dn, 'CN') || safeGet(dn, 'commonName'),
        organization: safeGet(dn, 'O') || safeGet(dn, 'organization'),
        organizationalUnit: safeGet(dn, 'OU') || safeGet(dn, 'organizationalUnit'),
        country: safeGet(dn, 'C') || safeGet(dn, 'country'),
        state: safeGet(dn, 'ST') || safeGet(dn, 'state'),
        locality: safeGet(dn, 'L') || safeGet(dn, 'locality'),
        email: safeGet(dn, 'emailAddress') || safeGet(dn, 'E')
      })

      const expiryDate = new Date(cert.valid_to)
      const issueDate = new Date(cert.valid_from)
      const daysRemaining = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      return {
        version: safeGet(cert, 'version', 3),
        serialNumber: safeGet(cert, 'serialNumber', 'unknown'),
        signatureAlgorithm: safeGet(cert, 'sigalg', 'unknown'),
        issuer: parseDN(safeGet(cert, 'issuer', {})),
        subject: parseDN(safeGet(cert, 'subject', {})),
        validity: {
          notBefore: issueDate.toISOString(),
          notAfter: expiryDate.toISOString(),
          isValid: daysRemaining > 0,
          daysRemaining
        },
        publicKey: {
          algorithm: getPublicKeyAlgorithm(cert),
          keySize: safeGet(cert, 'bits')
        },
        extensions: {
          subjectAlternativeNames: getSubjectAlternativeNames(cert)
        }
      }
    }

    // Create a clean certificate object without circular references
    const cleanCert = {
      subject: certificate.subject,
      issuer: certificate.issuer,
      valid_from: certificate.valid_from,
      valid_to: certificate.valid_to,
      bits: certificate.bits,
      fingerprint: certificate.fingerprint,
      subjectaltname: certificate.subjectaltname
    }

    const certificateInfo = parseCertificateInfo(cleanCert)

    return NextResponse.json({
      type: 'certificate',
      input: url,
      info: certificateInfo,
      rawText: JSON.stringify(cleanCert, null, 2)
    })

  } catch (error) {
    console.error('SSL check error:', error)
    
    return NextResponse.json({
      type: 'certificate',
      input: request.body?.url || '',
      info: {},
      rawText: '',
      error: error instanceof Error ? error.message : 'SSL check failed'
    })
  }
}

function getPublicKeyAlgorithm(cert: any): string {
  try {
    if (cert.bits) {
      return cert.bits >= 2048 ? 'RSA' : 'RSA'
    }
    return 'Unknown'
  } catch (error) {
    return 'Unknown'
  }
}

function getKeySize(cert: any): number | undefined {
  try {
    return cert.bits || undefined
  } catch (error) {
    return undefined
  }
}

function getSubjectAlternativeNames(cert: any): string[] {
  try {
    if (cert.subjectaltname) {
      return cert.subjectaltname.split(',').map((san: string) => san.trim())
    }
    return []
  } catch (error) {
    return []
  }
}