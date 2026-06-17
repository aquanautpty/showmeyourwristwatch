import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

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
              text: `You are a world-class watch expert AND a hilariously accurate personality profiler. You have encyclopedic knowledge of watch history, brands, models, price points, complications, and what each watch signals about its owner.

Analyze this watch photo using ALL available clues:

**Watch Identification:**
- Brand and model (use your deep knowledge: Rolex Submariner, Patek Philippe Calatrava, AP Royal Oak, Omega Speedmaster, Seiko SKX, Casio G-Shock, etc.)
- Approximate retail price / market value
- Case size (small ~36mm = more likely female/classic taste; large 44mm+ = male/sport-oriented)
- Dial color, complications, material (steel, gold, titanium, ceramic)
- Strap type (rubber = sporty/outdoor; metal bracelet = professional; leather = classic/elegant)
- Production era (vintage pre-1990, transitional 90s-2000s, modern post-2010)

**Personality Inference Rules (apply these):**
- GENDER/AGE: Small case + muted dial (white/silver/blue) = more feminine or older classic taste. Bold large case + colorful dial = younger, masculine. Patek Calatrava or Grand Seiko = likely 50s-70s connoisseur. G-Shock = 20s-30s practical/outdoorsy.
- WEALTH & CAR: Under $500 watch → probably drives a Honda, Toyota, or similar. $1k-$5k → BMW 3-series, Audi A4 range. $5k-$20k → Porsche 911, Mercedes E-class. $20k-$100k → Ferrari, Lamborghini, Range Rover. $100k+ → Bentley, Rolls-Royce, McLaren.
- AGE from brand: Casio digital, Swatch, colorful G-Shock = 18-30. Rolex Submariner/Daytona = 30-50 ambitious professional. Patek Philippe dress watch = 50-70 old-money connoisseur. AP Royal Oak = 35-55 flashy successful.
- PERSONALITY from brand heritage: Tool watches (dive/pilot/racing) = adventurous, practical. Dress watches = refined, traditional, patient. Fashion watches = trend-conscious, social. Independent brands (MB&F, Urwerk) = eccentric, creative, wealthy.
- MUSIC: Match to lifestyle. Rolex Submariner owner → classic rock or jazz. AP Royal Oak → hip-hop and EDM. Patek Calatrava → classical or jazz. G-Shock → EDM, hip-hop. Seiko = indie rock or lo-fi.
- LOTS OF COLOR (rainbow bezels, bright dials, custom mods) = younger, extroverted, social media presence, loves attention.

Be specific, confident, funny, and a little savage. Your profile should feel eerily accurate.

Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "watch": "Exact brand and model (or best guess with confidence level)",
  "age": "Estimated age range (e.g. 28-35)",
  "vibe": "One punchy, funny sentence describing their overall energy",
  "music": "2-3 music genres they probably listen to",
  "song": "One specific song that perfectly defines them (Artist - Song Title)",
  "car": "Exactly ONE specific car model they likely drive (e.g. 'Porsche 911 Carrera S'). One car only, no alternatives, no slashes, no 'or'.",
  "job": "Their probable profession (be specific and funny)",
  "personality": ["Trait 1", "Trait 2", "Trait 3", "Trait 4"],
  "style": "modern | vintage | sporty | luxury | casual",
  "quote": "A short funny quote this person probably lives by",
  "roast": "A friendly but savage roast about what their watch choice reveals about them (reference the specific watch and its price/history)",
  "emoji": "1-2 emojis that perfectly represent this person"
}`,
            },
          ],
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Parse error', raw: text.slice(0, 200) }, { status: 500 });
      }
    }

    const { error: dbError } = await supabase.from('analyses').insert({
      watch: parsed.watch,
      style: parsed.style,
      age: parsed.age,
      job: parsed.job,
      music: parsed.music,
      car: parsed.car,
      vibe: parsed.vibe,
      emoji: parsed.emoji,
    });
    if (dbError) console.error('Supabase insert error:', dbError.message);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Analyze error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
