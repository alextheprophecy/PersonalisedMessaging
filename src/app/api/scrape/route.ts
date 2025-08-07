import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { Client } from '@googlemaps/google-maps-services-js';
import db from '../../../lib/db';

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
  latitude: number | null;
  longitude: number | null;
}

interface ScrapedData {
  adresse?: string;
  [key: string]: unknown;
}

async function performScrape(url: string): Promise<ScrapedData> {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    const $ = cheerio.load(html);

    const data: ScrapedData = {};

    // "Daten und Miete"
    $('h3.label:contains("Daten und Miete")').nextAll('p').each((_, el) => {
      const strongText = $(el).find('strong').text().trim();
      const value = $(el)
        .contents()
        .filter((__, child) => child.type === 'text')
        .text()
        .trim();
      if (strongText) {
        data[strongText.toLowerCase().replace(/ /g, '_')] = value;
      }
    });

    // "Adresse"
    $('h3.label:contains("Adresse")').nextAll('p').each((_, el) => {
      const strongText = $(el).find('strong').text().trim();
      if (strongText) {
        const value = $(el).clone().find('strong').remove().end().text().trim();
        data[strongText
          .toLowerCase()
          .replace(/ \/ /g, '_')
          .replace(/ /g, '_')] = value;
      }
    });

    // "Beschreibungen"
    $('h3:contains("Beschreibungen")')
      .nextAll('p')
      .first()
      .each((_, el) => {
        const description = $(el)
          .clone()
          .find('strong.float')
          .remove()
          .end()
          .html()
          ?.replace(/<br\s*\/?>/gi, '\n')
          .trim();
        data['description'] = description;
      });

    // "Wir suchen"
    $('h3:contains("Wir suchen")')
      .nextAll('p')
      .first()
      .each((_, el) => {
        const seeking = $(el).html()?.replace(/<br\s*\/?>/gi, '\n').trim();
        data['seeking'] = seeking;
      });

    // "Wir sind"
    $('h3:contains("Wir sind")')
      .nextAll('p')
      .first()
      .each((_, el) => {
        const we_are = $(el).html()?.replace(/<br\s*\/?>/gi, '\n').trim();
        data['we_are'] = we_are;
      });

    return data;
  } finally {
    await browser.close();
  }
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

async function calculateTransportTimesForScraping(origin: string): Promise<TransportTimes> {
  const result: TransportTimes = {
    walking_time: null,
    transit_time: null,
    cycling_time: null,
    latitude: null,
    longitude: null
  };

  try {
    // Get coordinates first
    const coordinates = await getCoordinatesFromAddress(origin);
    if (coordinates) {
      result.latitude = coordinates.lat;
      result.longitude = coordinates.lng;
    }

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
    }

  } catch (error) {
    console.error('Distance Matrix API error:', error);
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Check if the data is already in the database
    const selectStmt = db.prepare(
      'SELECT content, status FROM scraped_data WHERE url = ?'
    );
    const existing = selectStmt.get(url) as
      | { content: string; status: string }
      | undefined;

    if (existing) {
      if (existing.status === 'complete') {
        return NextResponse.json(JSON.parse(existing.content));
      }
      return NextResponse.json({ status: existing.status });
    }

    // Insert a new record with status "loading"
    const insertStmt = db.prepare(
      'INSERT INTO scraped_data (url, content, status) VALUES (?, ?, ?)' 
    );
    insertStmt.run(url, JSON.stringify({}), 'loading');

    // Perform the scraping in the background so the request can finish early
    (async () => {
      try {
        const scrapedData = await performScrape(url);

        if (Object.keys(scrapedData).length === 0) {
          console.log('No data scraped for', url);
          const errStmt = db.prepare(
            'UPDATE scraped_data SET status = ? WHERE url = ?'
          );
          errStmt.run('error', url);
          return;
        }

        // Calculate transport times if address is available and API key is configured
        let transportData: TransportTimes = {
          walking_time: null,
          transit_time: null,
          cycling_time: null,
          latitude: null,
          longitude: null
        };

        if (process.env.GOOGLE_MAPS_API_KEY && scrapedData.adresse) {
          const adresse = scrapedData.adresse as string;
          const ort = scrapedData.ort as string;
          
          // Build complete address
          let completeAddress = adresse;
          if (ort && !adresse.toLowerCase().includes('zürich') && !adresse.match(/\d{4}/)) {
            completeAddress = `${adresse}, ${ort}`;
          }
          
          console.log('Calculating transport times for address:', completeAddress);
          try {
            transportData = await calculateTransportTimesForScraping(completeAddress);
            console.log('Transport calculation completed:', transportData);
          } catch (error) {
            console.error('Error calculating transport times during scraping:', error);
          }
        } else {
          console.log('Skipping transport calculation:', {
            hasApiKey: !!process.env.GOOGLE_MAPS_API_KEY,
            hasAddress: !!scrapedData.adresse
          });
        }
        
        const updateStmt = db.prepare(
          'UPDATE scraped_data SET content = ?, status = ?, scraped_at = CURRENT_TIMESTAMP, walking_time = ?, transit_time = ?, cycling_time = ?, latitude = ?, longitude = ? WHERE url = ?'
        );
        updateStmt.run(
          JSON.stringify(scrapedData), 
          'complete', 
          transportData.walking_time,
          transportData.transit_time,
          transportData.cycling_time,
          transportData.latitude,
          transportData.longitude,
          url
        );
      } catch (err) {
        console.error('Background scraping failed:', err);
        const errStmt = db.prepare(
          'UPDATE scraped_data SET status = ? WHERE url = ?'
        );
        errStmt.run('error', url);
      }
    })();

    return NextResponse.json({ status: 'loading' });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to initiate scraping' },
      { status: 500 }
    );
  }
}