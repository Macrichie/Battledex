const IMAGE_STYLE = 'Bold flat-color illustration, thick black outlines, dynamic action pose, dramatic lighting, video game character art style. Keep it centered, filling most of the frame, isolated on a plain solid light grey background with no scenery. Absolutely no text, words, letters, numbers, logos, watermarks, UI elements, borders or frames of any kind. Illustration only, nothing else on canvas.';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fighterName } = req.body;
  if (!fighterName?.trim()) {
    return res.status(400).json({ error: 'Fighter name required.' });
  }

  try {
    const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-2.5-sunburst',
        prompt: `${fighterName.trim()}. ${IMAGE_STYLE}`,
        n: 1,
        size: '1024x1024',
        quality: 'low',
        output_format: 'webp',
      }),
    });

    const data = await imgRes.json();

    if (!imgRes.ok) {
      const blocked = data.error?.code === 'content_policy_violation';
      return res.status(200).json({ url: null, blocked });
    }

    const b64 = data.data?.[0]?.b64_json;
    if (b64) {
      return res.status(200).json({ url: `data:image/webp;base64,${b64}`, blocked: false });
    }

    // Fallback: check for url format
    const url = data.data?.[0]?.url;
    return res.status(200).json({ url: url ?? null, blocked: false });
  } catch {
    return res.status(200).json({ url: null, blocked: false });
  }
};
