import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { image, mediaType } = await req.json();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: image },
          },
          {
            type: 'text',
            text: `You are a witty, sharp personality profiler who reads people by their watches. Analyze the watch in this photo and give a fun, bold personality profile of the person wearing it.

Be specific, confident, and entertaining. Use the watch brand, style, material, complications, and overall vibe to make your guesses.

Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "watch": "Brand and model (or best guess)",
  "age": "Estimated age range",
  "vibe": "One punchy sentence describing their overall energy",
  "music": "Music genres they probably listen to",
  "car": "Car they likely drive",
  "job": "Their probable profession or field",
  "personality": ["Trait 1", "Trait 2", "Trait 3", "Trait 4"],
  "style": "modern | vintage | sporty | luxury | casual",
  "quote": "A short quote this person probably lives by",
  "roast": "A friendly roast about what their watch says about them"
}`,
          },
        ],
      },
    ],
  });

  const text = (response.content[0] as { type: string; text: string }).text;

  try {
    const result = JSON.parse(text);
    return NextResponse.json(result);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }
    return NextResponse.json({ error: 'Could not parse response' }, { status: 500 });
  }
}
