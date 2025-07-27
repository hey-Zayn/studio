'use server';

import * as cheerio from 'cheerio';

export interface ScrapeResult {
  emails: string[];
  phones: string[];
  names: string[];
}

interface ScrapeResponse {
  success: boolean;
  data?: ScrapeResult;
  error?: string;
}

const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const phoneRegex = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/g;
const nameRegex = /\b([A-Z][a-z']{2,})\s+([A-Z][a-z']{2,})\b/g;


export async function scrapeUrl(url: string): Promise<ScrapeResponse> {
  if (!url) {
    return { success: false, error: 'URL is required.' };
  }

  let fullUrl = url;
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    fullUrl = `https://${fullUrl}`;
  }

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
      next: { revalidate: 3600 } 
    });
    
    if (!response.ok) {
      return { success: false, error: `Failed to fetch URL. Status: ${response.status} ${response.statusText}. Please check the URL and try again.` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, noscript, svg, header, footer, nav').remove();
    
    const bodyText = $('body').text();
    
    const cleanText = bodyText
      .replace(/\s+/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .trim();


    const getUniqueMatches = (regex: RegExp) => 
      Array.from(cleanText.match(regex) || []).filter((item, index, self) => self.indexOf(item) === index);

    const emails = getUniqueMatches(emailRegex);
    const phones = getUniqueMatches(phoneRegex);
    const potentialNames = getUniqueMatches(nameRegex);
    
    const commonFalsePositives = ['Privacy Policy', 'Terms Of Service', 'Contact Us', 'About Us', 'All Rights Reserved', 'Cookie Policy', 'Terms And Conditions', 'Return Policy', 'Shipping Policy'];
    const filteredNames = potentialNames.filter(name => !commonFalsePositives.some(phrase => name.toLowerCase().includes(phrase.toLowerCase())));

    return {
      success: true,
      data: {
        emails,
        phones,
        names: filteredNames
      },
    };
  } catch (error) {
    console.error('Scraping error:', error);
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return { success: false, error: 'Failed to fetch the URL. This could be due to network issues, a typo in the URL, or the website blocking requests. Please verify the URL and your connection.' };
    }
    if (error instanceof Error) {
       return { success: false, error: `An error occurred: ${error.message}` };
    }
    return { success: false, error: 'An unknown error occurred during scraping.' };
  }
}
