'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Network, Search, Globe, Shield, List } from 'lucide-react'
import PingTab from '@/components/tools/PingTab'
import DigTab from '@/components/tools/DigTab'
import CheckHostTab from '@/components/tools/CheckHostTab'
import SSLDecoderTab from '@/components/tools/SSLDecoderTab'
import BulkCheckTab from '@/components/tools/BulkCheckTab'

export default function Home() {
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Network Tools</h1>
        <p className="text-muted-foreground">
          Comprehensive network diagnostic and SSL certificate tools
        </p>
      </div>

      <Tabs defaultValue="ping" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ping" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Ping
          </TabsTrigger>
          <TabsTrigger value="dig" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Dig
          </TabsTrigger>
          <TabsTrigger value="checkhost" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Check Host
          </TabsTrigger>
          <TabsTrigger value="ssl" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            SSL Decoder
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Bulk Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ping" className="mt-6">
          <PingTab />
        </TabsContent>

        <TabsContent value="dig" className="mt-6">
          <DigTab />
        </TabsContent>

        <TabsContent value="checkhost" className="mt-6">
          <CheckHostTab />
        </TabsContent>

        <TabsContent value="ssl" className="mt-6">
          <SSLDecoderTab />
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <BulkCheckTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}