# WG-Zimmer Scraper with Google Maps Integration

A Next.js application that scrapes house listings from wgzimmer.ch and shows transport times and distances to ETH Zurich main building using Google Maps APIs.

## Features

- **House Scraping**: Scrape house listings from wgzimmer.ch
- **Transport Analysis**: Calculate walking, cycling, and public transport times to ETH Zurich
- **Interactive Map**: View houses on an interactive Google Maps with markers
- **House Management**: Like, mark as done, or delete scraped houses
- **Responsive UI**: Modern glass-morphism design with dark theme

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
   - Directions API (optional for future enhancements)

4. Create credentials (API Key):
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the API key to your domain for security

### 3. Environment Variables

Copy the example environment file and add your Google Maps API key:

```bash
cp .env.example .env.local
```

Edit `.env.local` and replace the placeholder with your actual API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
```

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Usage

### Scraping Houses

1. Enter a wgzimmer.ch URL in the input field
2. Click "Scrape" to extract house information
3. The house will appear in the "Previously Scraped" section

### Transport Analysis

1. Click on a house to view its details
2. On the house detail page, click "Calculate Transport Times"
3. The system will calculate:
   - 🚶 Walking time to ETH Zurich
   - 🚌 Public transport time to ETH Zurich  
   - 🚴 Cycling time to ETH Zurich

### Interactive Map

1. On the house detail page, click "Show Map" to display the location
2. The map shows:
   - 🏫 ETH Zurich main building (green marker)
   - 🏠 The specific house location
3. Click on markers to see detailed information including transport times

### House Management

- ⭐ **Like**: Mark houses you're interested in
- ✅ **Done**: Mark houses you've finished reviewing
- 🗑️ **Delete**: Remove houses from your list

## Technical Details

### Database Schema

The SQLite database includes the following fields for each house:
- Basic info: `id`, `url`, `content`, `scraped_at`, `liked`, `status`, `done`
- Location: `latitude`, `longitude`
- Transport: `walking_time`, `transit_time`, `cycling_time`

### API Endpoints

- `GET /api/houses` - Fetch all scraped houses
- `POST /api/scrape` - Scrape a new house
- `GET /api/transport` - Calculate transport times for all houses (bulk operation)
- `POST /api/transport` - Calculate transport times for a specific house using its address

### Components

- `HousesMap.tsx` - Interactive Google Maps component
- House management UI with transport time display
- Modern glassmorphism design with 3D effects

## Target Location

All transport calculations are made to:
**ETH Zurich Main Building**  
Rämistrasse 101, 8006 Zürich, Switzerland  
Coordinates: 47.3769°N, 8.5417°E

## Troubleshooting

### Google Maps Not Loading
- Verify your API key is correct in `.env.local`
- Check that the Maps JavaScript API is enabled
- Ensure your API key has the correct permissions

### Transport Times Not Calculating
- Verify the Distance Matrix API is enabled
- Check your API key has sufficient quota
- Ensure addresses are valid and geocodable

### No Map Display
- Check browser console for JavaScript errors
- Verify the API key is accessible via `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Ensure the component is properly imported

## Cost Optimization

To minimize Google Maps API costs:
- Transport times are cached in the database
- Only calculate transport times when needed
- Use the bulk calculation endpoint for efficiency
- Consider implementing rate limiting for production use

## Future Enhancements

- Add routing visualization on the map
- Include real-time public transport data
- Add filtering by transport time thresholds
- Export house data with transport information
- Add commute cost calculations
