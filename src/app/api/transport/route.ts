import { NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';
import db from '@/lib/db';

const client = new Client({});

// ETH Zurich main building coordinates
const ETH_COORDINATES = {
  lat: 47.37659190407654,
  lng: 8.548000258889498,
  address: 'Rämistrasse 101, 8092 Zürich, Switzerland'
};

interface TransportTimes {
  walking_time: string | null;
  transit_time: string | null;
  cycling_time: string | null;
  walking_distance: string | null;
  transit_distance: string | null;
  cycling_distance: string | null;
}

interface HouseRow {
  id: number;
  content: string;
}

async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    console.log('Geocoding address:', address);
    console.log('Using API key:', process.env.GOOGLE_MAPS_API_KEY?.substring(0, 10) + '...');
    
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      }
    });

    console.log('Geocoding response status:', response.status);
    console.log('Geocoding results count:', response.data.results.length);
    
    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      console.log('Geocoded location:', location);
      return { lat: location.lat, lng: location.lng };
    }
    
    console.log('No geocoding results found for address:', address);
    return null;
  } catch (error: any) {
    console.error('Geocoding error details:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    return null;
  }
}

async function calculateTransportTimes(origin: string): Promise<TransportTimes> {
  const result: TransportTimes = {
    walking_time: null,
    transit_time: null,
    cycling_time: null,
    walking_distance: null,
    transit_distance: null,
    cycling_distance: null
  };

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Google Maps API key is not configured');
    return result;
  }

  console.log('Calculating transport times from:', origin, 'to:', ETH_COORDINATES.address);
  console.log('Using API key (first 10 chars):', apiKey.substring(0, 10) + '...');

  try {
    // Calculate walking time
    console.log('Attempting walking time calculation...');
    const walkingResponse = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [ETH_COORDINATES.address],
        mode: 'walking' as any,
        units: 'metric' as any,
        key: apiKey,
      }
    });

    console.log('Walking API response status:', walkingResponse.status);
    console.log('Walking API response data:', JSON.stringify(walkingResponse.data, null, 2));
    
    if (walkingResponse.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = walkingResponse.data.rows[0].elements[0];
      result.walking_time = element.duration?.text || null;
      result.walking_distance = element.distance?.text || null;
      console.log('Walking time calculated:', result.walking_time);
    } else {
      console.log('Walking calculation failed:', walkingResponse.data.rows[0]?.elements[0]?.status);
    }

    // Calculate transit time
    console.log('Attempting transit time calculation...');
    const transitResponse = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [ETH_COORDINATES.address],
        mode: 'transit' as any,
        units: 'metric' as any,
        key: apiKey,
      }
    });

    console.log('Transit API response status:', transitResponse.status);
    if (transitResponse.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = transitResponse.data.rows[0].elements[0];
      result.transit_time = element.duration?.text || null;
      result.transit_distance = element.distance?.text || null;
      console.log('Transit time calculated:', result.transit_time);
    } else {
      console.log('Transit calculation failed:', transitResponse.data.rows[0]?.elements[0]?.status);
    }

    // Calculate cycling time
    console.log('Attempting cycling time calculation...');
    const cyclingResponse = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [ETH_COORDINATES.address],
        mode: 'bicycling' as any,
        units: 'metric' as any,
        key: apiKey,
      }
    });

    console.log('Cycling API response status:', cyclingResponse.status);
    if (cyclingResponse.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = cyclingResponse.data.rows[0].elements[0];
      result.cycling_time = element.duration?.text || null;
      result.cycling_distance = element.distance?.text || null;
      console.log('Cycling time calculated:', result.cycling_time);
    } else {
      console.log('Cycling calculation failed:', cyclingResponse.data.rows[0]?.elements[0]?.status);
    }

  } catch (error: any) {
    console.error('Distance Matrix API error details:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    
    // Check for specific error types
    if (error.response?.status === 403) {
      console.error('403 Forbidden: This usually means:');
      console.error('1. API key is invalid or missing');
      console.error('2. Distance Matrix API is not enabled');
      console.error('3. Billing is not set up');
      console.error('4. API key restrictions are blocking the request');
    }
  }

  return result;
}

function buildCompleteAddress(adresse: string, ort?: string): string {
  // If address already seems complete (contains numbers and city), use as is
  if (adresse.toLowerCase().includes('zürich') || 
      adresse.toLowerCase().includes('zurich') || 
      adresse.toLowerCase().includes('switzerland') ||
      adresse.match(/\d{4}/)) { // Contains 4-digit postal code
    return adresse;
  }
  
  // Combine street address with city/postal code
  if (ort) {
    const fullAddress = `${adresse}, ${ort}`;
    console.log('Built complete address:', fullAddress);
    return fullAddress;
  }
  
  // Fallback: assume Zürich if no city provided
  const fallbackAddress = `${adresse}, Zürich, Switzerland`;
  console.log('Using fallback address:', fallbackAddress);
  return fallbackAddress;
}

export async function POST(request: Request) {
  try {
    const { houseId, address, ort } = await request.json();
    
    console.log('=== TRANSPORT CALCULATION START ===');
    console.log('House ID:', houseId);
    console.log('Address received:', address);
    console.log('Ort (city) received:', ort);
    
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key not configured');
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    if (!houseId || !address) {
      console.error('Missing required parameters:', { houseId, address });
      return NextResponse.json({ error: 'House ID and address are required' }, { status: 400 });
    }

    // Build complete address using both address and ort
    const completeAddress = buildCompleteAddress(address, ort);
    console.log('Complete address for calculation:', completeAddress);

    console.log('Getting coordinates for address:', completeAddress);
    // Get coordinates for the address
    const coordinates = await getCoordinatesFromAddress(completeAddress);
    console.log('Coordinates result:', coordinates);
    
    console.log('Calculating transport times...');
    // Calculate transport times
    const transportTimes = await calculateTransportTimes(completeAddress);
    console.log('Transport times result:', transportTimes);

    // Update the database with the calculated transport times and coordinates
    const updateStmt = db.prepare(`
      UPDATE scraped_data 
      SET walking_time = ?, transit_time = ?, cycling_time = ?, latitude = ?, longitude = ?
      WHERE id = ?
    `);

    updateStmt.run(
      transportTimes.walking_time,
      transportTimes.transit_time,
      transportTimes.cycling_time,
      coordinates?.lat || null,
      coordinates?.lng || null,
      houseId
    );

    return NextResponse.json({
      success: true,
      transportTimes,
      coordinates,
      ethLocation: ETH_COORDINATES
    });

  } catch (error) {
    console.error('Error calculating transport times:', error);
    return NextResponse.json({ error: 'Failed to calculate transport times' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    // Get all houses that don't have transport data
    const stmt = db.prepare(`
      SELECT id, content 
      FROM scraped_data 
      WHERE walking_time IS NULL OR transit_time IS NULL OR cycling_time IS NULL
    `);
    const houses = stmt.all() as HouseRow[];

    const results = [];

         for (const house of houses) {
       try {
         const content = JSON.parse(house.content);
         const address = content.adresse;
         const ort = content.ort;
         
         if (address) {
           const completeAddress = buildCompleteAddress(address, ort);
           const coordinates = await getCoordinatesFromAddress(completeAddress);
           const transportTimes = await calculateTransportTimes(completeAddress);
          
          // Update the database
          const updateStmt = db.prepare(`
            UPDATE scraped_data 
            SET walking_time = ?, transit_time = ?, cycling_time = ?, latitude = ?, longitude = ?
            WHERE id = ?
          `);

          updateStmt.run(
            transportTimes.walking_time,
            transportTimes.transit_time,
            transportTimes.cycling_time,
            coordinates?.lat || null,
            coordinates?.lng || null,
            house.id
          );

          results.push({
            id: house.id,
            address,
            transportTimes,
            coordinates
          });
        }
      } catch (error) {
        console.error(`Error processing house ${house.id}:`, error);
        results.push({
          id: house.id,
          error: 'Failed to process address'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      ethLocation: ETH_COORDINATES
    });

  } catch (error) {
    console.error('Error bulk calculating transport times:', error);
    return NextResponse.json({ error: 'Failed to calculate transport times' }, { status: 500 });
  }
}
