# Async Virus Scanning for File Uploads

Protect against malicious file uploads with automated virus scanning.

## Why Virus Scanning?

**Risk**: Users can upload:
- Property images
- Maintenance request photos
- Voice notes
- Documents

**Threat**: Malicious files could:
- Infect other users who download them
- Exploit vulnerabilities in image viewers
- Contain ransomware or trojans

**Solution**: Scan all uploads asynchronously:
1. Accept upload immediately (UX)
2. Queue file for scanning
3. Mark file as safe/infected in database
4. Quarantine infected files

## Provider Options

### Option 1: Cloudmersive (Recommended)

**Pros**:
- Free tier: 800 scans/month
- REST API (works with Supabase Edge Functions)
- Fast: <1s scan time
- 99.9% detection rate

**Pricing**:
- Free: 800 scans/month
- Starter: $9/month for 5,000 scans
- Pro: $49/month for 50,000 scans

**Setup**:
1. Sign up at https://cloudmersive.com
2. Get API key from dashboard
3. Add to environment variables

### Option 2: VirusTotal

**Pros**:
- Industry-leading detection (70+ antivirus engines)
- Comprehensive file analysis

**Cons**:
- Uploaded files become public
- Slower (3-5s scan time)
- More expensive

**Use Case**: Additional verification for flagged files

## Setup

### 1. Environment Variables

Add to `.env`:
```bash
# Virus Scanning
CLOUDMERSIVE_API_KEY=your-api-key
VIRUS_SCAN_ENABLED=true
```

Add to Supabase Edge Function secrets:
```bash
supabase secrets set CLOUDMERSIVE_API_KEY=your-api-key
```

### 2. Database Schema

Add virus scan status to files:

```sql
-- Migration: 20250111_add_virus_scan_fields.sql

ALTER TABLE storage.objects
ADD COLUMN virus_scan_status TEXT DEFAULT 'pending' CHECK (
  virus_scan_status IN ('pending', 'scanning', 'safe', 'infected', 'error')
),
ADD COLUMN virus_scan_result JSONB,
ADD COLUMN virus_scanned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_objects_virus_scan_status ON storage.objects(virus_scan_status)
WHERE virus_scan_status = 'pending';

COMMENT ON COLUMN storage.objects.virus_scan_status IS
  'Status of virus scan: pending (uploaded but not scanned), scanning (in progress), safe (clean), infected (malware detected), error (scan failed)';
```

### 3. Supabase Edge Function

Create `supabase/functions/virus-scan/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLOUDMERSIVE_API_KEY = Deno.env.get('CLOUDMERSIVE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  try {
    const { bucket, path } = await req.json();

    // Download file from storage
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Update status to scanning
    await supabase.storage
      .from(bucket)
      .update(path, { virus_scan_status: 'scanning' });

    // Scan file with Cloudmersive
    const formData = new FormData();
    formData.append('file', fileData);

    const scanResponse = await fetch(
      'https://api.cloudmersive.com/virus/scan/file',
      {
        method: 'POST',
        headers: {
          'Apikey': CLOUDMERSIVE_API_KEY!,
        },
        body: formData,
      }
    );

    const scanResult = await scanResponse.json();

    // Update file status based on scan result
    const isInfected = scanResult.CleanResult === false;
    const status = isInfected ? 'infected' : 'safe';

    await supabase.storage
      .from(bucket)
      .update(path, {
        virus_scan_status: status,
        virus_scan_result: scanResult,
        virus_scanned_at: new Date().toISOString(),
      });

    // If infected, move to quarantine bucket
    if (isInfected) {
      const quarantinePath = `quarantine/${path}`;
      await supabase.storage.from('quarantine').upload(quarantinePath, fileData);
      await supabase.storage.from(bucket).remove([path]);

      console.warn(`INFECTED FILE QUARANTINED: ${bucket}/${path}`, scanResult);
    }

    return new Response(JSON.stringify({ status, scanResult }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Virus scan failed:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4. Trigger Scan After Upload

In your upload function:

```typescript
import { supabase } from '../lib/supabase';

async function uploadFile(bucket: string, path: string, file: File) {
  // 1. Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      metadata: {
        virus_scan_status: 'pending',
      },
    });

  if (error) throw error;

  // 2. Trigger async virus scan
  await supabase.functions.invoke('virus-scan', {
    body: { bucket, path },
  });

  // 3. Return immediately (don't wait for scan)
  return data;
}
```

## Client-Side Handling

### Show Scan Status to User

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function FileUploadStatus({ bucket, path }) {
  const [scanStatus, setScanStatus] = useState('pending');

  useEffect(() => {
    // Subscribe to file metadata updates
    const subscription = supabase
      .channel(`file:${bucket}:${path}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'storage',
        table: 'objects',
        filter: `name=eq.${path}`,
      }, (payload) => {
        setScanStatus(payload.new.virus_scan_status);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [bucket, path]);

  return (
    <div>
      {scanStatus === 'pending' && '⏳ Scanning for viruses...'}
      {scanStatus === 'scanning' && '🔍 Scanning in progress...'}
      {scanStatus === 'safe' && '✅ File is safe'}
      {scanStatus === 'infected' && '⚠️ Malware detected - file removed'}
      {scanStatus === 'error' && '❌ Scan failed'}
    </div>
  );
}
```

### Prevent Download of Unscanned Files

```typescript
async function downloadFile(bucket: string, path: string) {
  // Check virus scan status first
  const { data: metadata } = await supabase.storage
    .from(bucket)
    .list(path);

  const file = metadata?.find((f) => f.name === path);

  if (file?.metadata?.virus_scan_status === 'pending') {
    throw new Error('File is still being scanned. Please try again in a moment.');
  }

  if (file?.metadata?.virus_scan_status === 'infected') {
    throw new Error('This file has been flagged as malware and cannot be downloaded.');
  }

  // Safe to download
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;

  return data;
}
```

## Testing

### Test with EICAR Test File

EICAR is a harmless file that all antivirus scanners detect as malware:

```typescript
async function testVirusScan() {
  // Create EICAR test file
  const eicar = new Blob([
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
  ]);

  const file = new File([eicar], 'eicar.txt', { type: 'text/plain' });

  // Upload test file
  const result = await uploadFile('test-bucket', 'eicar.txt', file);

  // Wait for scan (should detect as infected)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Check status
  const { data } = await supabase.storage.from('test-bucket').list('eicar.txt');
  console.log('Scan result:', data[0].metadata.virus_scan_status);
  // Expected: 'infected'
}
```

## Monitoring

### Scan Success Rate

Track in Sentry:

```typescript
const scanResult = await scanFile(bucket, path);

if (scanResult.status === 'error') {
  Sentry.captureMessage('Virus scan failed', {
    level: 'error',
    tags: { bucket, path },
    extra: { error: scanResult.error },
  });
}

if (scanResult.status === 'infected') {
  Sentry.captureMessage('Malware detected', {
    level: 'critical',
    tags: { bucket, path },
    extra: { scanResult: scanResult.details },
  });
}
```

### Cloudmersive Usage

Check API usage in dashboard:
- Daily scans
- Remaining quota
- Error rate

## Security Best Practices

1. **Always scan before allowing downloads**
2. **Quarantine infected files** (never delete immediately)
3. **Log all detections** for audit trail
4. **Rate limit uploads** to prevent abuse
5. **Set max file size** (Cloudmersive limit: 50MB)
6. **Validate file types** before upload
7. **Use temporary pre-signed URLs** for downloads (expire after 1 hour)

## Cost Optimization

### Reduce Scans

1. **Only scan user-uploaded files** (skip system-generated images)
2. **Cache scan results** (don't re-scan same file hash)
3. **Set file size limit** (max 10MB for images)

### Hash-Based Deduplication

```typescript
async function uploadWithDedup(bucket: string, path: string, file: File) {
  // Calculate file hash
  const hash = await calculateFileHash(file);

  // Check if file with same hash already scanned
  const { data: existing } = await supabase
    .from('file_hashes')
    .select('virus_scan_status')
    .eq('hash', hash)
    .single();

  if (existing?.virus_scan_status === 'safe') {
    // Skip scan - already verified safe
    await supabase.storage.from(bucket).upload(path, file, {
      metadata: { virus_scan_status: 'safe' },
    });
    return;
  }

  // New file - upload and scan
  await uploadFile(bucket, path, file);
}
```

## Alternatives to Cloudmersive

| Provider | Free Tier | Price | Detection Rate |
|----------|-----------|-------|----------------|
| Cloudmersive | 800/month | $9/5K | 99.9% |
| VirusTotal | None | $500/month | 99.99% (70 engines) |
| MetaDefender | 100/day | $99/month | 99.5% |
| ClamAV (Self-hosted) | Unlimited | Free | 95% |

## Resources

- Cloudmersive API Docs: https://api.cloudmersive.com/docs/virus.asp
- VirusTotal API: https://developers.virustotal.com/reference
- Supabase Storage: https://supabase.com/docs/guides/storage
- EICAR Test File: https://www.eicar.org/download-anti-malware-testfile/
