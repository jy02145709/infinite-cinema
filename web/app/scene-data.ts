export const sceneData = {
  model: "Gemini 2.5 Flash",
  generatedAt: "2026-08-09T07:33:31.656Z",
  whatIf: "What if Juliet woke up 5 seconds earlier?",
  sceneDNA: {
    summary: "Romeo kneels beside a stone sarcophagus where Juliet lies motionless. He holds a small vial, contemplating a fatal choice in a dimly lit gothic crypt.",
    location: "Gothic crypt · carved stone sarcophagus · rose window",
    visualStyle: {
      lighting: "Cold moonlight contrasted with warm candlelight",
      camera: "Static medium-wide shot at eye level",
      pacing: "Slow, deliberate, emotionally restrained",
    },
    characters: [
      { id: "ROMEO", emotion: "Grief-stricken · desperate", action: "Kneeling with poison vial" },
      { id: "JULIET", emotion: "Peaceful · unresponsive", action: "Lying motionless" },
    ],
    continuityLocks: ["Character identity", "Period costumes", "Stone sarcophagus", "Gothic crypt", "Rose window", "Moonlight + candles", "Poison vial"],
    observedObjects: ["Poison vial", "Sarcophagus", "Candles", "Rose window", "Statues", "Flowers"],
  },
  alternativeTimeline: {
    changedEvent: "Juliet wakes before Romeo consumes the poison.",
    newOutcome: "Romeo notices her movement and lowers the untouched vial.",
    beats: [
      { time: "0–2s", action: "Romeo raises the vial while Juliet remains still." },
      { time: "2–4s", action: "Juliet's eyes open; Romeo notices movement." },
      { time: "4–6s", action: "Romeo lowers the vial as despair turns to hope." },
    ],
    generationPrompt: "A young man in a dark red period costume kneels beside a stone sarcophagus where a young woman in a light gown lies. He holds a small vial to his lips, grief-stricken. As he prepares to drink, the young woman's eyes slowly open, and she stirs slightly. The man, noticing her movement, lowers the vial, his expression shifting from despair to shock and hope. The scene is set in a dimly lit gothic crypt with candles and a large rose window in the background, bathed in moonlight. The camera is static, medium-wide shot, eye-level. The man's hand lowers the vial, untouched, as he looks at her.",
    negativePrompt: "No modern elements, no anachronisms, no blurry faces, no distorted limbs, no extra characters, no bright colors, no happy expressions on Romeo initially, no open vial after he lowers it, no drinking of the poison, no sudden movements, no extreme close-ups.",
  },
} as const;
