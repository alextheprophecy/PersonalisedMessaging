import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);

    const data: { [key: string]: any } = {};

    // Scrape "Daten und Miete"
    $('h3.label:contains("Daten und Miete")').nextAll('p').each((i, el) => {
      const strongText = $(el).find('strong').text().trim();
      const value = $(el).contents().filter((_, child) => child.type === 'text').text().trim();
      if (strongText) {
        data[strongText.toLowerCase().replace(/ /g, '_')] = value;
      }
    });

    // Scrape "Adresse"
    $('h3.label:contains("Adresse")').nextAll('p').each((i, el) => {
      const strongText = $(el).find('strong').text().trim();
      if (strongText) {
        // Clone the element, remove the strong tag, and get the text
        const value = $(el).clone().find('strong').remove().end().text().trim();
        data[strongText.toLowerCase().replace(/ \/ /g, '_').replace(/ /g, '_')] = value;
      }
    });

    // Scrape "Beschreibungen"
    $('h3:contains("Beschreibungen")').nextAll('p').first().each((i, el) => {
      const description = $(el).clone().find('strong.float').remove().end().html()?.replace(/<br\s*\/?>/gi, '\n').trim();
      data['description'] = description;
    });

    // Scrape "Wir suchen"
    $('h3:contains("Wir suchen")').nextAll('p').first().each((i, el) => {
      const seeking = $(el).html()?.replace(/<br\s*\/?>/gi, '\n').trim();
      data['seeking'] = seeking;
    });

    // Scrape "Wir sind"
    $('h3:contains("Wir sind")').nextAll('p').first().each((i, el) => {
      const we_are = $(el).html()?.replace(/<br\s*\/?>/gi, '\n').trim();
      data['we_are'] = we_are;
    });

    if (Object.keys(data).length === 0) {
      console.log('No data scraped. Page title:', $('title').text());
      console.log('HTML preview:', html.substring(0, 500));
      return NextResponse.json({ error: 'Failed to scrape any data. The website structure may have changed or it might be a client-side rendered page.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to scrape the page' }, { status: 500 });
  }
}
