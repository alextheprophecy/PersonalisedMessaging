import { NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export async function GET() {
  try {
    console.log('Testing geocoding...');
    
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 });
    }

    // Test with a known address
    const testAddress = 'Bahnhofstrasse 1, 8001 Zürich, Switzerland';
    
    console.log('Testing geocoding with address:', testAddress);
    console.log('API key:', process.env.GOOGLE_MAPS_API_KEY.substring(0, 10) + '...');
    
    const response = await client.geocode({
      params: {
        address: testAddress,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      }
    });

    console.log('Geocoding response:', {
      status: response.status,
      resultCount: response.data.results.length,
      results: response.data.results
    });

    // Test Distance Matrix
    if (response.data.results.length > 0) {
      console.log('Testing Distance Matrix...');
      
      const distanceResponse = await client.distancematrix({
        params: {
          origins: [testAddress],
          destinations: ['Rämistrasse 101, 8006 Zürich, Switzerland'],
          mode: 'walking' as any,
          units: 'metric' as any,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        }
      });

      console.log('Distance Matrix response:', {
        status: distanceResponse.status,
        data: distanceResponse.data
      });

      return NextResponse.json({
        success: true,
        geocoding: {
          status: response.status,
          resultCount: response.data.results.length,
          firstResult: response.data.results[0]
        },
        distanceMatrix: {
          status: distanceResponse.status,
          data: distanceResponse.data
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No geocoding results'
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data
    });
  }
}
