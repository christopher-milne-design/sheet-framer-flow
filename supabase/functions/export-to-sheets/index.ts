import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageMetadata {
  name: string;
  size: number;
  width: number;
  height: number;
  url?: string;
}

interface ExportRequest {
  images: ImageMetadata[];
  spreadsheetId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Export to Sheets function called');
    
    const { images, spreadsheetId }: ExportRequest = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and parse service account credentials
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Google credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
    } catch (e) {
      console.error('Failed to parse service account key:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid Google credentials format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth token
    console.log('Getting OAuth token...');
    const tokenResponse = await getAccessToken(credentials);
    
    if (!tokenResponse.success) {
      console.error('Failed to get access token:', tokenResponse.error);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Google' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenResponse.token;

    // Create or update spreadsheet
    let finalSpreadsheetId = spreadsheetId;
    let sheetUrl = '';

    if (!finalSpreadsheetId) {
      console.log('Creating new spreadsheet...');
      const createResponse = await createSpreadsheet(accessToken, images);
      
      if (!createResponse.success) {
        console.error('Failed to create spreadsheet:', createResponse.error);
        return new Response(
          JSON.stringify({ error: 'Failed to create spreadsheet' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalSpreadsheetId = createResponse.spreadsheetId;
      sheetUrl = createResponse.url;
    } else {
      console.log('Updating existing spreadsheet...');
      const updateResponse = await updateSpreadsheet(accessToken, finalSpreadsheetId, images);
      
      if (!updateResponse.success) {
        console.error('Failed to update spreadsheet:', updateResponse.error);
        return new Response(
          JSON.stringify({ error: 'Failed to update spreadsheet' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      sheetUrl = `https://docs.google.com/spreadsheets/d/${finalSpreadsheetId}`;
    }

    console.log('Export completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        spreadsheetId: finalSpreadsheetId,
        url: sheetUrl,
        imageCount: images.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in export-to-sheets function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getAccessToken(credentials: any) {
  try {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Create JWT manually
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedClaim = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    // Import private key
    const privateKey = credentials.private_key;
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKey.substring(pemHeader.length, privateKey.length - pemFooter.length - 1).replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signatureInput}.${encodedSignature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return { success: false, error };
    }

    const tokenData = await tokenResponse.json();
    return { success: true, token: tokenData.access_token };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in getAccessToken';
    return { success: false, error: errorMessage };
  }
}

async function createSpreadsheet(accessToken: string, images: ImageMetadata[]) {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const spreadsheetData = {
      properties: {
        title: `Image Export - ${timestamp}`
      },
      sheets: [{
        properties: {
          title: 'Images',
          gridProperties: {
            frozenRowCount: 1
          }
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [
            // Header row
            {
              values: [
                { userEnteredValue: { stringValue: 'Filename' }, userEnteredFormat: { textFormat: { bold: true } } },
                { userEnteredValue: { stringValue: 'Width (px)' }, userEnteredFormat: { textFormat: { bold: true } } },
                { userEnteredValue: { stringValue: 'Height (px)' }, userEnteredFormat: { textFormat: { bold: true } } },
                { userEnteredValue: { stringValue: 'Size (bytes)' }, userEnteredFormat: { textFormat: { bold: true } } },
                { userEnteredValue: { stringValue: 'Size (KB)' }, userEnteredFormat: { textFormat: { bold: true } } },
                { userEnteredValue: { stringValue: 'URL' }, userEnteredFormat: { textFormat: { bold: true } } }
              ]
            },
            // Data rows
            ...images.map(img => ({
              values: [
                { userEnteredValue: { stringValue: img.name } },
                { userEnteredValue: { numberValue: img.width } },
                { userEnteredValue: { numberValue: img.height } },
                { userEnteredValue: { numberValue: img.size } },
                { userEnteredValue: { numberValue: Math.round(img.size / 1024 * 100) / 100 } },
                { userEnteredValue: { stringValue: img.url || '' } }
              ]
            }))
          ]
        }]
      }]
    };

    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(spreadsheetData)
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return { 
      success: true, 
      spreadsheetId: result.spreadsheetId,
      url: result.spreadsheetUrl
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in createSpreadsheet';
    return { success: false, error: errorMessage };
  }
}

async function updateSpreadsheet(accessToken: string, spreadsheetId: string, images: ImageMetadata[]) {
  try {
    // Prepare data rows
    const values = [
      ['Filename', 'Width (px)', 'Height (px)', 'Size (bytes)', 'Size (KB)', 'URL'],
      ...images.map(img => [
        img.name,
        img.width,
        img.height,
        img.size,
        Math.round(img.size / 1024 * 100) / 100,
        img.url || ''
      ])
    ];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Images!A1:F${images.length + 1}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in updateSpreadsheet';
    return { success: false, error: errorMessage };
  }
}
