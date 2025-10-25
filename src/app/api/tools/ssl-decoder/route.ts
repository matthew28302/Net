import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as tls from 'tls'
import * as forge from 'node-forge'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { input, type = 'certificate' } = await request.json()

    if (!input) {
      return NextResponse.json(
        { error: 'Certificate/CSR input is required' },
        { status: 400 }
      )
    }

    let certificateInfo: any = {}

    try {
      // Parse the certificate/CSR using node-forge
      const pem = input.trim()
      
      if (type === 'certificate') {
        // Parse X.509 certificate
        const cert = forge.pki.certificateFromPem(pem)
        
        certificateInfo = {
          version: cert.version,
          serialNumber: cert.serialNumber,
          signatureAlgorithm: cert.siginfo.algorithmOid,
          issuer: parseDN(cert.issuer),
          subject: parseDN(cert.subject),
          validity: {
            notBefore: cert.validity.notBefore.toISOString(),
            notAfter: cert.validity.notAfter.toISOString(),
            isValid: cert.validity.notAfter > new Date(),
            daysRemaining: Math.floor((cert.validity.notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          },
          publicKey: {
            algorithm: cert.publicKey.type,
            keySize: cert.publicKey.n ? cert.publicKey.n.bitLength() : undefined
          },
          extensions: {
            subjectAlternativeNames: cert.getExtension('subjectAltName')?.altNames?.map((alt: any) => alt.value) || []
          }
        }
      } else {
        // Parse CSR
        const csr = forge.pki.certificationRequestFromPem(pem)
        
        certificateInfo = {
          version: csr.version || 1,
          signatureAlgorithm: csr.siginfo.algorithmOid,
          subject: parseDN(csr.subject),
          validity: {
            notBefore: new Date().toISOString(),
            notAfter: new Date().toISOString(),
            isValid: true,
            daysRemaining: undefined
          },
          publicKey: {
            algorithm: csr.publicKey.type,
            keySize: csr.publicKey.n ? csr.publicKey.n.bitLength() : undefined
          },
          extensions: {
            subjectAlternativeNames: csr.getAttribute ? 
              csr.getAttribute('subjectAlternativeName')?.value?.split(',') || [] : []
          }
        }
      }

    } catch (parseError) {
      throw new Error(`Failed to parse ${type}: ${parseError instanceof Error ? parseError.message : 'Parse error'}`)
    }

    return NextResponse.json({
      type,
      input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
      info: certificateInfo,
      rawText: input
    })

  } catch (error) {
    console.error('SSL decode error:', error)
    
    return NextResponse.json({
      type: request.body?.type || 'certificate',
      input: request.body?.input || '',
      info: {},
      rawText: '',
      error: error instanceof Error ? error.message : 'SSL decode failed'
    })
  }
}

function parseDN(dn: any) {
  // Helper function to safely get attribute value
  const getAttributeValue = (dn: any, attr: string, shortAttr?: string) => {
    try {
      // Try short attribute first (like CN), then long attribute (like commonName)
      const value = dn.getField(shortAttr || attr)?.value || dn.getField(attr)?.value
      return value || undefined
    } catch (error) {
      return undefined
    }
  }

  return {
    commonName: getAttributeValue(dn, 'commonName', 'CN'),
    organization: getAttributeValue(dn, 'organization', 'O'),
    organizationalUnit: getAttributeValue(dn, 'organizationalUnit', 'OU'),
    country: getAttributeValue(dn, 'country', 'C'),
    state: getAttributeValue(dn, 'state', 'ST'),
    locality: getAttributeValue(dn, 'locality', 'L'),
    email: getAttributeValue(dn, 'emailAddress', 'E') || getAttributeValue(dn, 'email')
  }
}