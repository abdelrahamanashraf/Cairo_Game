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
