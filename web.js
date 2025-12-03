const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Connection: "keep-alive",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  Referer: "https://www.stuttgart-airport.com/",
};


const axios = require("axios");
const cheerio = require("cheerio");

async function findFlight(flightNo) {
  const url =
    "https://www.stuttgart-airport.com/arrival-departure/departures/?period=tomorrow";

  const res = await axios.get(url, {
    headers: BROWSER_HEADERS,
    responseType: "arraybuffer"
  });

  const html = res.data.toString("utf8");
  const $ = cheerio.load(html);

  // 1️⃣ Search whole HTML
  const index = html.indexOf(flightNo);
  console.log("Found at HTML index:", index);

  // 2️⃣ Find the exact element in Cheerio
  const elements = $(`*:contains("${flightNo}")`);

  console.log("Found elements:", elements.length);

  elements.each((i, el) => {
    console.log("---- ELEMENT ----");
    console.log($(el).parent().html());
  });
}

findFlight("LH 2153");