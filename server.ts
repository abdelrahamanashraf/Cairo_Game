import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Attach a billing-enabled Gemini API key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Server-side Lyria 3 music generation endpoint
  app.post('/api/music/generate', async (req, res) => {
    try {
      const { prompt, mode } = req.body as { prompt?: string; mode?: 'clip' | 'pro' };
      const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
      if (!cleanPrompt || cleanPrompt.length > 600) {
        res.status(400).json({ error: 'Please provide a valid music prompt (1–600 characters).' });
        return;
      }

      const model = mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
      const ai = getGeminiClient();

      const stream = await ai.models.generateContentStream({
        model,
        contents: cleanPrompt,
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(502).json({ error: 'Lyria returned no audio stream for this prompt. Please retry.' });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      res.json({
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        lyrics: lyrics.trim(),
        model,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Music generation failed.';
      const status =
        msg.includes('403') || msg.includes('PERMISSION_DENIED')
          ? 403
          : msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
            ? 429
            : msg.includes('GEMINI_API_KEY')
              ? 400
              : 500;
      res.status(status).json({
        error:
          status === 429 || status === 403
            ? 'Lyria 3 requires a billing-enabled Gemini API key. You can attach one in Settings > Secrets, or continue using the built-in Cairo synth score.'
            : msg,
      });
    }
  });

  // Server-side Google Maps Grounding endpoint (gemini-4-hydrogen + googleMaps tool)
  app.post('/api/maps/grounding', async (req, res) => {
    try {
      const body = req.body as {
        query?: unknown;
        districtName?: unknown;
        lat?: unknown;
        lng?: unknown;
      };

      const rawQuery = typeof body.query === 'string' ? body.query.trim() : '';
      const rawDistrict = typeof body.districtName === 'string' ? body.districtName.trim().slice(0, 100) : '';
      if (!rawQuery || rawQuery.length < 2 || rawQuery.length > 280) {
        res.status(400).json({ error: 'Please provide a valid Cairo location or district query (2–280 characters).' });
        return;
      }

      const latNum = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : 30.0444;
      const lngNum = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : 31.2357;
      if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        res.status(400).json({ error: 'Coordinates are out of valid latitude/longitude bounds.' });
        return;
      }

      const ai = getGeminiClient();
      const prompt = rawDistrict
        ? `Provide a concise, grounded tactical & architectural scouting brief for a 3D action game set in "${rawDistrict}" in Greater Cairo, Egypt. Focus on real nearby landmarks, notable streets, squares, and architectural character around this query: "${rawQuery}". Keep it crisp (4-6 bullet points, plain Markdown, no JSON).`
        : `Scout this Greater Cairo, Egypt location for a 3D third-person action game map: "${rawQuery}". List real nearby landmarks, major streets, architectural features, and atmosphere using Google Maps data. Keep it concise (4-6 bullet points, plain Markdown, no JSON).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: latNum,
                longitude: lngNum,
              },
            },
          },
        },
      });

      const isSafeHttpUrl = (url: unknown): url is string =>
        typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'));

      interface RawGroundingChunk {
        maps?: {
          uri?: string;
          title?: string;
          placeId?: string;
          placeAnswerSources?: {
            reviewSnippets?: Array<{
              uri?: string;
              title?: string;
              reviewText?: string;
            }>;
          };
        };
      }

      const rawChunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) as RawGroundingChunk[];
      const seenUris = new Set<string>();
      const places: Array<{
        title: string;
        uri: string;
        reviewSnippets: Array<{ text: string; uri?: string }>;
      }> = [];

      for (const chunk of rawChunks) {
        const maps = chunk.maps;
        if (!maps || !isSafeHttpUrl(maps.uri)) continue;
        if (seenUris.has(maps.uri)) continue;
        seenUris.add(maps.uri);

        const snippets: Array<{ text: string; uri?: string }> = [];
        const rawReviews = maps.placeAnswerSources?.reviewSnippets ?? [];
        for (const rev of rawReviews) {
          const text = typeof rev.reviewText === 'string' ? rev.reviewText.trim() : '';
          if (text) {
            snippets.push({
              text: text.slice(0, 220),
              uri: isSafeHttpUrl(rev.uri) ? rev.uri : undefined,
            });
          }
        }

        places.push({
          title: typeof maps.title === 'string' && maps.title.trim() ? maps.title.trim() : 'Google Maps Place',
          uri: maps.uri,
          reviewSnippets: snippets,
        });
      }

      res.json({
        summary: (response.text ?? '').trim(),
        places,
        model: 'gemini-4-hydrogen',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Maps grounding request failed.';
      const status =
        msg.includes('403') || msg.includes('PERMISSION_DENIED')
          ? 403
          : msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
            ? 429
            : msg.includes('GEMINI_API_KEY')
              ? 400
              : 500;
      res.status(status).json({
        error:
          status === 403 || status === 400
            ? 'Check your Gemini API key in Settings > Secrets to enable live Google Maps grounding.'
            : status === 429
              ? 'Gemini API rate limit reached. Please retry in a moment or check Settings > Secrets.'
              : msg,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cairo Precinct server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
