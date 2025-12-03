// server.js
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 7000;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve prototype flipboard page
app.get("/flipboard", (req, res) => {
  res.sendFile(path.join(__dirname, "prototype.html"));
});

// URLs
const STR_DEPARTURES_URL = "https://www.stuttgart-airport.com/arrival-departure/departures/";
const STR_ARRIVALS_URL = "https://www.stuttgart-airport.com/arrival-departure/arrivals/";

// Headers to avoid 403
const HEADERS = {
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

// Fetch HTML
async function fetchHtml(url, retries = 2) {
  try {
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
      validateStatus: () => true,
    });

    if (res.status === 403) throw new Error("Oopsie doopsie the server knows you're a bot (403)");
    return res.data;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
      return fetchHtml(url, retries - 1);
    }
    throw err;
  }
}

// Parse flight data
function parseFlights(html, trafficType = 'departure', fetchDate = new Date()) {
    const $ = cheerio.load(html);
    const flights = [];

    $(".flights-table__item").each((_, el) => {
        const row = $(el);
        
        // Filter by traffic type (departure or arrival)
        const flightTraffic = row.attr('data-flights-table-traffic');
        if (flightTraffic !== trafficType) {
            return; // Skip this flight
        }

        // Get the day attribute (today or tomorrow)
        const flightsDay = row.attr('data-flights-day') || 'today';
        
        // Calculate actual date based on data-flights-day
        // Use local timezone to match client expectations
        const flightDate = new Date(fetchDate);
        if (flightsDay === 'tomorrow') {
            flightDate.setDate(flightDate.getDate() + 1);
        }
        // Format as YYYY-MM-DD in local timezone
        const year = flightDate.getFullYear();
        const month = String(flightDate.getMonth() + 1).padStart(2, '0');
        const day = String(flightDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // 1) TIME — planned + actual (actual may be early/late)
        const planned = row.find(".is--plan").text().trim() || null;

        let actual =
            row.find(".is--actual").text().trim() || //prob redundant
            row.find(".is--late").text().trim() ||
            row.find(".is--early").text().trim() ||
            null;

        // 2) DESTINATION
        const destination = row.find(".flights-table__cell-from p").text().trim() || null;

        // 3) AIRLINE + FLIGHT NO
        const airlineRaw = row.find(".flights-table__cell-airline p").text().trim();
        let flightNumber = null;
        let airline = null;
        if (airlineRaw) {
            const parts = airlineRaw.split("\n").map(x => x.trim()).filter(Boolean);
            flightNumber = parts[0] || null;
            airline = parts[1] || null;
        }

        // 4) AIRCRAFT — remove label
        let aircraft = row.find(".flights-table__cell-aircraft").text().trim() || null;
        if (aircraft) aircraft = aircraft.replace("Aircraft type:", "").trim();

        // 5) TERMINAL — remove label
        let terminal = row.find(".flights-table__cell-terminal").text().trim() || null;
        if (terminal) terminal = terminal.replace("Terminal:", "").trim();

        // 6) CHECK-IN — remove label
        let checkin = row.find(".flights-table__cell-checkin").text().trim() || null;
        if (checkin) checkin = checkin.replace("Check-in:", "").trim();

        // 7) GATE — handle gate changes
        const gateCell = row.find(".flights-table__cell-gate");
        let gate = null, gateOld = null, gateNew = null;

        const gateSpans = gateCell.find("p span");

        if (gateCell.hasClass("has--previous-gate")) {
            gateOld = $(gateSpans[0]).text().trim() || null;
            gateNew = $(gateSpans[1]).text().trim() || null;

            // For UI convenience: current gate is new gate
            gate = gateNew;
        } else {
            // Single gate
            gate = gateCell.text().replace("Gate:", "").trim() || null;
        }

        // 8) STATUS
        const status = row.find(".flights-table__cell-status").text().trim() || null;

        flights.push({
            date: dateStr,
            plannedTime: planned,
            actualTime: actual,
            destination,
            flightNumber,
            airline,
            aircraft,
            terminal,
            checkin,
            gate,
            gateOld,
            gateNew,
            status
        });
    });

    return flights;
}


// Build URL
function buildUrl(base, day) {
  return day === "tomorrow" ? base + "?period=tomorrow" : base;
}

// Generic endpoint for departures - fetch and tag with actual dates
async function handleDepartures(req, res) {
  try {
    const now = new Date();

    // Fetch departures page (contains both today and tomorrow flights)
    const html = await fetchHtml(STR_DEPARTURES_URL);
    const allFlights = parseFlights(html, 'departure', now);

    // Count flights by date for logging
    const flightsByDate = allFlights.reduce((acc, flight) => {
      acc[flight.date] = (acc[flight.date] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Fetched departures:', flightsByDate);

    return res.json({
      airport: "Stuttgart STR",
      type: "departures",
      period: "today+tomorrow",
      fetchedAt: now.toISOString(),
      count: allFlights.length,
      flights: allFlights,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Generic endpoint for other types
async function handleFlights(req, res, baseUrl) {
  const day = req.query.day === "tomorrow" ? "tomorrow" : "today";

  try {
    const now = new Date();
    const url = buildUrl(baseUrl, day);
    const html = await fetchHtml(url);

    // keep debug dump
    fs.writeFileSync("str.html", html);
    
    // Determine traffic type from URL
    const trafficType = baseUrl.includes("departures") ? "departure" : "arrival";
    const flights = parseFlights(html, trafficType, now);

    return res.json({
      airport: "Stuttgart STR",
      type: baseUrl.includes("departures") ? "departures" : "arrivals",
      day,
      fetchedAt: now.toISOString(),
      count: flights.length,
      flights,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Routes
app.get("/api/str/departures", handleDepartures);

app.get("/api/str/arrivals", (req, res) =>
  handleFlights(req, res, STR_ARRIVALS_URL)
);

app.get("/api/health", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// Start
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
