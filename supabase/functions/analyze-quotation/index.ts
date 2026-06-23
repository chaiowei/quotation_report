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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { quotation_id, storage_path, file_name } = await req.json()
    if (!quotation_id) throw new Error('quotation_id is required')

    // Download file from Supabase Storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from('quotations')
      .download(storage_path)
    if (dlError) throw new Error('Storage download failed: ' + dlError.message)

    const ext = (file_name || storage_path || '').split('.').pop()?.toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png'].includes(ext)

    let geminiBody: object

    if (isImage) {
      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      geminiBody = {
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: isImage ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'application/pdf', data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }
    } else {
      // For PDF/Word/Excel: convert to base64 and use Gemini file API
      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
      }
      geminiBody = {
        contents: [{
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeMap[ext] || 'application/octet-stream', data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) },
    )
    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      throw new Error('Gemini API error: ' + errText)
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

    let parsed_items
    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed_items = JSON.parse(cleaned)
    } catch {
      throw new Error('Failed to parse Gemini response as JSON: ' + rawText.slice(0, 200))
    }

    // Update quotations table
    const { error: updateError } = await supabase
      .from('quotations')
      .update({ parsed_items, status: 'analyzed' })
      .eq('id', quotation_id)
    if (updateError) throw new Error('DB update failed: ' + updateError.message)

    return new Response(JSON.stringify({ parsed_items }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    // Mark as error in DB if we have the ID
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
