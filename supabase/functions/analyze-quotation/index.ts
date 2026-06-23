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

// Chunked base64 — avoids spread-operator stack overflow on large files
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Always return 200 so Supabase client populates data (not null)
function reply(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // --- Check env ---
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  if (!geminiKey) {
    return reply({ error: '[Config] GEMINI_API_KEY secret is not set. Go to Supabase Dashboard → Edge Functions → Secrets and add it.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return reply({ error: '[Config] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not available.' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // --- Parse request body ---
  let quotation_id: string, storage_path: string, file_name: string
  try {
    const body = await req.json()
    quotation_id = body.quotation_id
    storage_path = body.storage_path
    file_name     = body.file_name ?? ''
  } catch {
    return reply({ error: '[Request] Invalid JSON body.' })
  }

  if (!quotation_id) return reply({ error: '[Request] quotation_id is required.' })
  if (!storage_path) return reply({ error: '[Request] storage_path is null. This quotation was uploaded before storage_path was added to the schema. Please re-upload the file.' })

  // --- Download file from Storage ---
  const { data: fileBlob, error: dlError } = await supabase.storage
    .from('quotations')
    .download(storage_path)
  if (dlError) {
    return reply({ error: `[Storage] Download failed: ${dlError.message}` })
  }

  // --- Build Gemini request ---
  const ext = (file_name || storage_path).split('.').pop()?.toLowerCase() ?? ''
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
  const mimeType = mimeMap[ext] ?? 'application/octet-stream'

  let base64: string
  try {
    base64 = toBase64(await fileBlob.arrayBuffer())
  } catch (e) {
    return reply({ error: `[File] Could not read file: ${e}` })
  }

  // --- Call Gemini ---
  let geminiRes: Response
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      },
    )
  } catch (e) {
    return reply({ error: `[Gemini] Network error calling Gemini API: ${e}` })
  }

  if (!geminiRes.ok) {
    const body = await geminiRes.text()
    return reply({ error: `[Gemini] API returned ${geminiRes.status}: ${body.slice(0, 400)}` })
  }

  const geminiJson = await geminiRes.json()
  const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!rawText) {
    const reason = geminiJson.candidates?.[0]?.finishReason ?? 'unknown'
    return reply({ error: `[Gemini] Empty response. finishReason: ${reason}. File type "${ext}" may not be supported for inline_data parsing.` })
  }

  // --- Parse JSON from Gemini output ---
  let parsed_items: object[]
  try {
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    parsed_items = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return reply({ error: `[Parse] Gemini did not return valid JSON. Raw output: ${rawText.slice(0, 300)}` })
  }

  // --- Update quotations table ---
  const { error: updateError } = await supabase
    .from('quotations')
    .update({ parsed_items, status: 'analyzed' })
    .eq('id', quotation_id)
  if (updateError) {
    return reply({ error: `[DB] Update failed: ${updateError.message}` })
  }

  return reply({ parsed_items })
})
