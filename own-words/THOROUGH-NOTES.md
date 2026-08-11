# Thorough lexical layer

`words-thorough.js` is deliberately separate from the core word lexicon.

All entries in this layer are quality 1, so they are eligible only in Thorough mode. The goal is candidate density: long passages often exhausted the smaller core lexicon before reaching a visibly deep rewrite. The added vocabulary emphasizes common analytical prose rather than domain terminology.

The layer must remain conservative about meaning. Avoid replacements for numbers, named entities, specialized technical terms, legal/medical terminology, or highly polysemous function words. Prefer inflected verb families and common descriptive nouns/adjectives where the alternative is usually substitutable in ordinary expository prose.

The engine remains responsible for overlap removal, dispersion, rhetorical-family diversity, hard candidate caps, and rewrite-depth stopping. Users still approve or reject every surfaced edit.
