import { NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';
import db from '@/lib/db';

const client = new Client({});

// ETH Zurich main building coordinates
const ETH_COORDINATES = {
  lat: 47.3769,
  lng: 8.5417,
  address: 'Rämistrasse 101, 8006 Zürich, Switzerland'
};

interface TransportTimes {
  walking_time: string | null;
  transit_time: string | null;
  cycling_time: string | null;
  walking_distance: string | null;
  transit_distance: string | null;
  cycling_distance: string | null;
}

async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      }
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
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

  try {
    // Calculate walking time
    const walkingResponse = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [ETH_COORDINATES.address],
        mode: 'walking' as any,
        units: 'metric' as any,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      }
    });

    if (walkingResponse.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = walkingResponse.data.rows[0].elements[0];
      result.walking_time = element.duration?.text || null;
      result.walking_distance = element.distance?.text || null;
    }

    // Calculate transit time
    const transitResponse = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [ETH_COORDINATES.address],
        mode: 'transit' as any,
        units: 'metric' as any,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      }
    });

    if (transitResponse.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = transitResponse.data.rows[0].elements[0];
      result.transit_time = element.duration?.text || null;
      result.transit_distance = element.distance?.text || null;
    }

    // Calculate cycling time
    const cyclingResponse = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [ETH_COORDINATES.address],
        mode: 'bicycling' as any,
        units: 'metric' as any,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      }
    });

    if (cyclingResponse.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = cyclingResponse.data.rows[0].elements[0];
      result.cycling_time = element.duration?.text || null;
      result.cycling_distance = element.distance?.text || null;
    }

  } catch (error) {
    console.error('Distance Matrix API error:', error);
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const { houseId, address } = await request.json();
    
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    if (!houseId || !address) {
      return NextResponse.json({ error: 'House ID and address are required' }, { status: 400 });
    }

    // Get coordinates for the address
    const coordinates = await getCoordinatesFromAddress(address);
    
    // Calculate transport times
    const transportTimes = await calculateTransportTimes(address);

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
    const houses = stmt.all();

    const results = [];

    for (const house of houses) {
      try {
        const content = JSON.parse(house.content);
        const address = content.adresse;
        
        if (address) {
          const coordinates = await getCoordinatesFromAddress(address);
          const transportTimes = await calculateTransportTimes(address);
          
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
