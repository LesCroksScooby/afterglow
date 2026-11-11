# Afterglow

A small installable web app that tells you when the sun rises and sets, wherever you are, and whether tonight's sky is worth going out for.

No account, no cookies, no build step: just static files that work offline once loaded.

## Features

- **Tonight**: sunset or sunrise time, a beauty score out of 100, and how reliable the forecast is.
- **Week**: the best evening ahead, a calendar reminder, meteor showers and lunar eclipses.
- **Sky**: a draggable day curve, a compass you can aim with your phone, hourly weather, the moon and the year's sunrise and sunset curve.
- **Journal**: your ratings fine-tune the score, your spots tell you when to leave, and you can set the place and sounds.

The score looks at clouds along the sun's path (40 to 150 km in its direction) and at the clouds above you. It's an estimate.

## Run it locally

Nothing to install or build:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 and choose your place in **Journal > Settings**.

## Deploy

Upload the files to any static host with HTTPS, at the root of the domain. HTTPS is required for installing the app, offline mode, geolocation and the compass.

Before going live:

1. **Legal page.** Fill in the "Publisher" and "Host" sections of `legal.html` as required by the law where you live.
2. **Apache servers.** The hidden `.htaccess` file forces HTTPS, removes "www", serves the custom 404 page and adds security headers. On another server, set up the same rules.
3. **Search engines.** Create a `sitemap.xml` listing your pages, then uncomment the `Sitemap` line in `robots.txt`. For a preview image on social networks, add an `og:image` tag to `index.html` with the full URL of a 1200 × 630 px image.
4. **External services.** If you add one, allow its address in `connect-src` on the `Content-Security-Policy` line of `.htaccess`.

## Tests

```bash
node --test "tests/*.test.js"
```

## Offline updates

A changed file reaches users the next time they open the app. If you add or rename a file, add it to `FILES` in `sw.js` and bump `VERSION`.

## Privacy

There are no accounts, cookies or analytics. The place, ratings and spots stay in the browser. Coordinates are sent to [Open-Meteo](https://open-meteo.com/) for weather and terrain, and the name you search for to find a city.

## Limitations

- The interface is in English, with 24-hour times and metric units.
- Forecasts cover yesterday to 9 days ahead.
- Terrain data has a resolution of about 90 m and doesn't include trees or buildings.
- Automatic alerts would need a server; the app offers a calendar reminder instead.

## Credits and licences

- Code: [MIT](LICENSE)
- Astronomy: SunCalc ([licence](SUNCALC-LICENSE.txt))
- Instrument Serif typeface: [SIL OFL](fonts/OFL-LICENSE.txt)
- Weather, geocoding and terrain: [Open-Meteo](https://open-meteo.com/)
