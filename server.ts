import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Helper to get effective API key
  const getApiKey = (reqKey?: string) => {
    return (
      reqKey?.trim() ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY?.trim() ||
      process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY?.trim() ||
      ''
    );
  };

  // 1. API route: Validate GCP API Key
  app.post('/api/places/validate-key', async (req, res) => {
    try {
      const { apiKey } = req.body;
      const keyToUse = getApiKey(apiKey);

      if (!keyToUse) {
        return res.status(400).json({
          valid: false,
          message: 'No API key provided or found in environment.',
        });
      }

      // Perform a minimal Places API (New) test call
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': keyToUse,
            'X-Goog-FieldMask': 'places.id,places.displayName',
          },
          body: JSON.stringify({
            textQuery: 'Paris',
            pageSize: 1,
            languageCode: 'fr',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        return res.status(200).json({
          valid: false,
          message:
            data.error?.message ||
            `Google API returned status ${response.status}`,
        });
      }

      return res.status(200).json({
        valid: true,
        message: 'Google Cloud Places API Key successfully validated!',
      });
    } catch (err: any) {
      return res.status(500).json({
        valid: false,
        message: err.message || 'Server error while validating API key',
      });
    }
  });

  // 2. API route: Search Places by Text (Google Places API New)
  app.post('/api/places/search', async (req, res) => {
    try {
      const {
        apiKey,
        textQuery,
        lat,
        lng,
        radiusMeters = 20000,
        pageSize = 20,
        languageCode = 'fr',
        includeEditorialSummary,
        includeGenerativeSummary,
        includeReviewSummary,
        includeReviews,
        includeRestroom,
        includePriceLevel,
      } = req.body;

      const keyToUse = getApiKey(apiKey);

      if (!keyToUse) {
        return res.status(400).json({
          error: {
            code: 400,
            message:
              'API Key Google Cloud Platform missing. Please enter your API Key or configure GOOGLE_MAPS_PLATFORM_KEY.',
          },
        });
      }

      if (!textQuery) {
        return res.status(400).json({
          error: { code: 400, message: 'textQuery is required.' },
        });
      }

      const bodyPayload: Record<string, any> = {
        textQuery,
        pageSize: Math.min(pageSize, 20),
        languageCode,
      };

      if (typeof lat === 'number' && typeof lng === 'number') {
        bodyPayload.locationBias = {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        };
      }

      // Base fields always fetched
      const fieldMasks = [
        'places.id',
        'places.name',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.rating',
        'places.userRatingCount',
        'places.googleMapsUri',
        'places.websiteUri',
        'places.nationalPhoneNumber',
        'places.businessStatus',
        'places.types',
        'places.primaryType',
        'places.regularOpeningHours',
        'places.photos',
        'places.addressComponents',
      ];

      // Add optional Enterprise SKU / AI summary fields if requested
      if (includeEditorialSummary) fieldMasks.push('places.editorialSummary');
      if (includeGenerativeSummary) fieldMasks.push('places.generativeSummary');
      if (includeReviewSummary) fieldMasks.push('places.reviewSummary');
      if (includeReviews) fieldMasks.push('places.reviews');
      if (includeRestroom) fieldMasks.push('places.restroom');
      if (includePriceLevel) fieldMasks.push('places.priceLevel');

      // Fallback for default request without explicit booleans
      if (
        includeEditorialSummary === undefined &&
        includeGenerativeSummary === undefined &&
        includeReviewSummary === undefined &&
        includeReviews === undefined
      ) {
        fieldMasks.push(
          'places.reviews',
          'places.editorialSummary',
          'places.generativeSummary',
          'places.reviewSummary'
        );
      }

      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': keyToUse,
            'X-Goog-FieldMask': fieldMasks.join(','),
          },
          body: JSON.stringify(bodyPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.json(data);
    } catch (err: any) {
      console.error('Error fetching places:', err);
      return res.status(500).json({
        error: {
          code: 500,
          message: err.message || 'Internal server error while calling Google Places API',
        },
      });
    }
  });

  // 3. API route: Health check & Env status
  app.get('/api/health', (req, res) => {
    const hasEnvKey = Boolean(process.env.GOOGLE_MAPS_PLATFORM_KEY);
    res.json({
      status: 'ok',
      hasEnvKey,
      envKeyPrefix: hasEnvKey
        ? process.env.GOOGLE_MAPS_PLATFORM_KEY?.slice(0, 6) + '...'
        : null,
    });
  });

  // Vite middleware for dev / static for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
