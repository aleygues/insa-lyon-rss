import axios from "axios";
import * as cheerio from "cheerio";
import { parse } from "date-fns";

// Fetch the HTML content of the page
const url = "https://www.insa-lyon.fr/fr/actualites";

async function fetchHTML(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching the URL: ${error}`);
    throw error;
  }
}

// Parse the HTML content using Cheerio
async function parseHTML(html: string): Promise<string> {
  const $ = cheerio.load(html);
  let rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
    <channel>
    <title>INSA Lyon News</title>
    <link>${url}</link>
    <description>Latest news from INSA Lyon</description>
    `;

  for (const element of $("div.actu").toArray()) {
    const title = $(element).find("h4").text().trim();
    const link = $(element).find("h4 a").attr("href");
    const description = $(element).find("p.excerpt").text().trim();
    const pubDate = parse(
      $(element).find("span.date").text().trim(),
      "dd/MM/yyyy",
      new Date(),
    ).toJSON(); //30/03/2026

    const imgSrc = $(element).find("img").attr("src");

    rssFeed += `
      <item>
      <title>${title}</title>
      <link>https://www.insa-lyon.fr${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${imgSrc}" type="image/jpeg" />
      </item>
    `;
  }

  rssFeed += `
    </channel>
    </rss>`;

  return rssFeed;
}

// Main function to execute the script
export async function getRss() {
  try {
    const html = await fetchHTML(url);
    const rssFeed = await parseHTML(html);
    return rssFeed;
  } catch (error) {
    console.error(`An error occurred: ${error}`);
  }
}
