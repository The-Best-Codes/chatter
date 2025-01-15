import fetch from "node-fetch";
import { parse } from "node-html-parser";

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
}

export async function generateLinkPreview(
  url: string,
): Promise<LinkPreviewData | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch URL: ${url}, status: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const root = parse(html);

    const ogTitle = root
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content");
    const ogDescription = root
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content");
    const ogImage = root
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content");
    const title = root.querySelector("title")?.textContent;
    const description = root
      .querySelector('meta[name="description"]')
      ?.getAttribute("content");

    return {
      title: ogTitle || title || null,
      description: ogDescription || description || null,
      image: ogImage || null,
      url: url,
    };
  } catch (error) {
    console.error(`Error fetching or parsing URL: ${url}`, error);
    return null;
  }
}
