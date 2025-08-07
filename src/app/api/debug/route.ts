import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const publicApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // Test a simple geocoding request to verify API key works
    let apiTestResult = null;
    if (apiKey) {
      try {
        const { Client } = await import('@googlemaps/google-maps-services-js');
        const client = new Client({});
        
        const testResponse = await client.geocode({
          params: {
            address: 'ETH Zurich, Zurich, Switzerland',
            key: apiKey,
          }
        });
        
        apiTestResult = {
          success: true,
          statusCode: testResponse.status,
          resultCount: testResponse.data.results.length
        };
      } catch (error: any) {
        apiTestResult = {
          success: false,
          error: error.message,
          statusCode: error.response?.status || 'unknown',
          errorCode: error.code || 'unknown'
        };
      }
    }
    
    return NextResponse.json({
      hasServerApiKey: !!apiKey,
      hasPublicApiKey: !!publicApiKey,
      serverApiKeyLength: apiKey ? apiKey.length : 0,
      publicApiKeyLength: publicApiKey ? publicApiKey.length : 0,
      serverApiKeyStart: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      apiTest: apiTestResult
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Debug API failed' }, { status: 500 });
  }
}
