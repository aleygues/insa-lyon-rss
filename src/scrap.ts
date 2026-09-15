import axios from "axios";
import * as cheerio from "cheerio";
import { parse, format } from "date-fns";

// Fetch the HTML content of the page
const url = "https://www.insa-lyon.fr/fr/actualites";

// Format date to RFC-822 (RSS 2.0 spec)
function formatRfc822(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const dayName = days[date.getUTCDay()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const monthName = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  
  return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds} GMT`;
}

// Sanitize text for XML/RSS by escaping special characters
function sanitizeXml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching the URL: ${error}`);
    throw error;
  }
}

// Get content length from URL via HEAD request
async function getContentLength(url: string): Promise<number | null> {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    const length = response.headers["content-length"];
    if (length) {
      return parseInt(length, 10);
    }
    return null;
  } catch (error) {
    console.error(`Error getting content length for ${url}: ${error}`);
    return null;
  }
}

// Parse the HTML content using Cheerio
async function parseHTML(html: string): Promise<string> {
  const $ = cheerio.load(html);
  const feedUrl = "https://www.insa-lyon.fr/fr/actualites";
  
  let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
    <title>INSA Lyon News</title>
    <link>${url}</link>
    <description>Latest news from INSA Lyon</description>
    <atom:link rel="self" href="${feedUrl}" />
    `;

  // Collect all enclosure URLs to fetch lengths in parallel
  const enclosurePromises: Promise<{imgSrc: string; length: number | null}>[] = [];
  
  for (const element of $("div.actu").toArray()) {
    const imgSrc = $(element).find("img").attr("src");
    if (imgSrc) {
      enclosurePromises.push(
        getContentLength(imgSrc).then((length) => ({ imgSrc, length }))
      );
    }
  }
  
  // Wait for all content length requests
  const enclosureResults = await Promise.all(enclosurePromises);
  let enclosureIndex = 0;

  for (const element of $("div.actu").toArray()) {
    const title = sanitizeXml($(element).find("h4").text().trim());
    const link = sanitizeXml($(element).find("h4 a").attr("href"));
    const description = sanitizeXml($(element).find("p.excerpt").text().trim());
    const dateText = $(element).find("span.date").text().trim();
    const dateObj = parse(dateText, "dd/MM/yyyy", new Date());
    const pubDate = formatRfc822(dateObj);

    const imgSrc = $(element).find("img").attr("src");
    const itemUrl = `https://www.insa-lyon.fr${link}`;
    
    // Get the enclosure result if available
    const enclosureResult = imgSrc ? enclosureResults[enclosureIndex++] : null;

    rssFeed += `
      <item>
      <title>${title}</title>
      <link>${itemUrl}</link>
      <guid>${itemUrl}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      ${enclosureResult && enclosureResult.length 
        ? `<enclosure url="${sanitizeXml(enclosureResult.imgSrc)}" length="${enclosureResult.length}" type="image/jpeg" />` 
        : ""
      }
      </item>
    `;
  }

  rssFeed += `
    </channel>
    </rss>`;

  return rssFeed;
}

// Main function to execute the script
export async function getRss(): Promise<string> {
  try {
    const html = await fetchHTML(url);
    const rssFeed = await parseHTML(html);
    return rssFeed;
  } catch (error) {
    console.error(`An error occurred: ${error}`);
    throw error;
  }
}
