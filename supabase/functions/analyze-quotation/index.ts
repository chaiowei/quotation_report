import { createClient } from 'jsr:@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-1.5-flash'

const PROMPT = `You are an expert procurement engineer.
Analyze the attached quotation document and extract ALL line items into a JSON array.
Each item must have:
- spec: material specification string (exactly as written)
- unit: unit of measure (M, EA, SET, KG, etc.)
- qty: quantity (number, null if not stated)
- price: unit price as number (null if not stated)

Return ONLY a valid JSON array, no markdown, no explanation.
Example: [{"spec":"2\\" SCH40 CS Pipe ASTM A106","unit":"M","qty":100,"price":450}]`

// Safe base64 for large files — avoids spread operator stack overflow
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function ok(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function fail(message: string, status = 500) {
  console.error('[analyze-quotation]', message)
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) return fail('GEMINI_API_KEY secret is not set in Supabase → Project Settings → Edge Functions → Secrets')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  let quotation_id: string
  let storage_path: string
  let file_name: string

  try {
    const body = await req.json()
    quotation_id = body.quotation_id
    storage_path = body.storage_path
    file_name = body.file_name
  } catch {
    return fail('Invalid JSON body', 400)
  }

  if (!quotation_id) return fail('quotation_id is required', 400)

  // Download from Supabase Storage
  const { data: fileData, error: dlError } = await supabase.storage
    .from('quotations')
    .download(storage_path)
  if (dlError) return fail('Storage download failed: ' + dlError.message)

  const ext = (file_name || storage_path || '').split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    pdf:  'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls:  'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc:  'application/msword',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
  }
  const mimeType = mimeMap[ext] || 'application/octet-stream'

  let base64: string
  try {
    const buf = await fileData.arrayBuffer()
    base64 = toBase64(buf)
  } catch (e) {
    return fail('Failed to read file: ' + String(e))
  }

  const geminiBody = {
    contents: [{
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) },
  )

  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    return fail(`Gemini API error (${geminiRes.status}): ${errText}`)
  }

  const geminiData = await geminiRes.json()
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!rawText) return fail('Gemini returned empty response. Check if the file is readable.')

  let parsed_items: object[]
  try {
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed_items = JSON.parse(cleaned)
    if (!Array.isArray(parsed_items)) parsed_items = [parsed_items]
  } catch {
    return fail('Gemini did not return valid JSON. Raw: ' + rawText.slice(0, 300))
  }

  const { error: updateError } = await supabase
    .from('quotations')
    .update({ parsed_items, status: 'analyzed' })
    .eq('id', quotation_id)
  if (updateError) return fail('DB update failed: ' + updateError.message)

  return ok({ parsed_items })
})
