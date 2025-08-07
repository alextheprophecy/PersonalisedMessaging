import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import db from '../../../lib/db';

interface ScrapedData {
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

        const updateStmt = db.prepare(
          'UPDATE scraped_data SET content = ?, status = ?, scraped_at = CURRENT_TIMESTAMP WHERE url = ?'
        );
        updateStmt.run(JSON.stringify(scrapedData), 'complete', url);
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
