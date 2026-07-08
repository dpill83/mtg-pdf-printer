import axios from 'axios';

// Scryfall asks for ~50–100ms between requests; stay conservative.
const SCRYFALL_MIN_REQUEST_INTERVAL_MS = 100;
const SCRYFALL_MAX_RETRIES = 4;
const COLLECTION_BATCH_SIZE = 75;

let lastScryfallRequestAt = 0;
let scryfallQueue = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const enqueueScryfallRequest = (fn) => {
  const run = scryfallQueue.then(fn, fn);
  scryfallQueue = run.catch(() => {});
  return run;
};

const shouldRetryScryfallRequest = (error) => {
  if (!error) return false;
  const status = error.response?.status;
  if (status === 429 || status === 503) return true;
  return !error.response;
};

const getRetryDelayMs = (error, attempt) => {
  const retryAfter = error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return Math.min(8000, 500 * 2 ** attempt);
};

const scryfallRequest = (method, url, config = {}) =>
  enqueueScryfallRequest(async () => {
    for (let attempt = 0; attempt <= SCRYFALL_MAX_RETRIES; attempt += 1) {
      const now = Date.now();
      const waitTime = Math.max(0, SCRYFALL_MIN_REQUEST_INTERVAL_MS - (now - lastScryfallRequestAt));
      if (waitTime > 0) {
        await sleep(waitTime);
      }

      lastScryfallRequestAt = Date.now();

      try {
        if (method === 'get') {
          return await axios.get(url, config);
        }
        return await axios.post(url, config.data, { headers: config.headers });
      } catch (error) {
        if (attempt < SCRYFALL_MAX_RETRIES && shouldRetryScryfallRequest(error)) {
          await sleep(getRetryDelayMs(error, attempt));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Scryfall request failed');
  });

const getScryfall = (url, config = {}) => scryfallRequest('get', url, config);

const postScryfall = (url, data) =>
  scryfallRequest('post', url, {
    data,
    headers: { 'Content-Type': 'application/json' },
  });

const mapCardFromScryfall = (card) => {
  if (card.card_faces && card.card_faces.length > 1) {
    const frontFace = card.card_faces[0];
    const backFace = card.card_faces[1];
    return {
      id: card.id,
      name: card.name,
      imageUrl: frontFace.image_uris?.large,
      backImageUrl: backFace.image_uris?.large,
      set: card.set_name,
      setCode: card.set,
      collectorNumber: card.collector_number,
      prints_search_uri: card.prints_search_uri,
      isDoubleFaced: true,
      frontName: frontFace.name,
      backName: backFace.name,
    };
  }

  const imageUrl = card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large;
  return {
    id: card.id,
    name: card.name,
    imageUrl,
    set: card.set_name,
    setCode: card.set,
    collectorNumber: card.collector_number,
    prints_search_uri: card.prints_search_uri,
    isDoubleFaced: false,
  };
};

const mapPrinting = (printing) => {
  if (printing.card_faces && printing.card_faces.length > 1) {
    const frontFace = printing.card_faces[0];
    const backFace = printing.card_faces[1];
    return {
      ...printing,
      imageUrl: frontFace.image_uris?.large,
      backImageUrl: backFace.image_uris?.large,
      isDoubleFaced: true,
      frontName: frontFace.name,
      backName: backFace.name,
    };
  }

  return {
    ...printing,
    imageUrl: printing.image_uris?.large || printing.card_faces?.[0]?.image_uris?.large,
    isDoubleFaced: false,
  };
};

const toCollectionIdentifier = (card) => {
  if (card.setCode && card.collectorNumber) {
    return {
      set: card.setCode.toLowerCase(),
      collector_number: String(card.collectorNumber),
    };
  }
  return { name: card.name };
};

// Parse decklist text into card objects
export const parseDecklist = (decklistText) => {
  const lines = decklistText.trim().split('\n');
  const cards = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match patterns like "1x Lightning Bolt (2XM) 123" or "1 Lightning Bolt"
    const match = trimmedLine.match(/^(\d+)(?:x\s*)?\s+(.+?)(?:\s+\(([^)]+)\)(?:\s+([A-Za-z0-9-]+))?)?\s*$/);
    if (match) {
      const [, quantity, cardName, setCode, collectorNumber] = match;
      cards.push({
        quantity: parseInt(quantity, 10),
        name: cardName.trim(),
        setCode: setCode ? setCode.trim() : null,
        collectorNumber: collectorNumber ? collectorNumber.trim() : null,
      });
      continue;
    }
    // Match lines with only a card name
    const nameOnly = trimmedLine.match(/^([A-Za-z0-9',:!\- ]+)$/);
    if (nameOnly) {
      cards.push({
        quantity: 1,
        name: nameOnly[1].trim(),
        setCode: null,
        collectorNumber: null,
      });
    }
  }
  return cards;
};

// Fetch a single card (fallback when collection misses)
export const fetchCardData = async (cardName, setCode = null, collectorNumber = null) => {
  try {
    let query = `!"${cardName}"`;
    if (setCode && collectorNumber) {
      query += ` set:${setCode} number:${collectorNumber}`;
    } else if (setCode) {
      query += ` set:${setCode}`;
    }
    const response = await getScryfall('https://api.scryfall.com/cards/search', {
      params: {
        q: query,
        unique: 'prints',
        order: 'released',
        dir: 'desc',
      },
    });
    if (response.data.data && response.data.data.length > 0) {
      return mapCardFromScryfall(response.data.data[0]);
    }
    throw new Error(`Card not found: ${cardName}`);
  } catch (error) {
    throw new Error(`Card not found: ${cardName}`);
  }
};

// Fetch all printings for a card using prints_search_uri
export const fetchAllPrintings = async (prints_search_uri) => {
  try {
    const printings = [];
    let nextPage = prints_search_uri;
    while (nextPage) {
      const response = await getScryfall(nextPage);
      if (response.data.data && response.data.data.length > 0) {
        printings.push(...response.data.data);
      }
      nextPage = response.data.has_more ? response.data.next_page : null;
    }
    printings.sort((a, b) => (b.released_at || '').localeCompare(a.released_at || ''));
    return printings.map(mapPrinting);
  } catch (error) {
    throw new Error('Failed to fetch printings');
  }
};

const fetchCollectionBatch = async (batch) => {
  const identifiers = batch.map(toCollectionIdentifier);
  const response = await postScryfall('https://api.scryfall.com/cards/collection', { identifiers });
  return {
    data: response.data.data || [],
    notFound: response.data.not_found || [],
  };
};

// Fetch multiple cards with collection API (far fewer requests than per-card search)
export const fetchMultipleCards = async (cards, onProgress = null) => {
  const results = [];
  const errors = [];
  const invalidLineIndices = [];

  if (onProgress) {
    onProgress({
      current: 0,
      total: cards.length,
      message: 'Loading cards from Scryfall...',
    });
  }

  for (let start = 0; start < cards.length; start += COLLECTION_BATCH_SIZE) {
    const batch = cards.slice(start, start + COLLECTION_BATCH_SIZE);
    const end = Math.min(start + COLLECTION_BATCH_SIZE, cards.length);

    if (onProgress) {
      onProgress({
        current: end,
        total: cards.length,
        message: `Loading cards ${start + 1}–${end} of ${cards.length}...`,
      });
    }

    try {
      const { data } = await fetchCollectionBatch(batch);
      const foundByKey = new Map();

      data.forEach((card) => {
        foundByKey.set(`${card.set}|${card.collector_number}`.toLowerCase(), card);
        foundByKey.set(card.name.toLowerCase(), card);
      });

      for (let i = 0; i < batch.length; i += 1) {
        const card = batch[i];
        const absoluteIndex = start + i;
        let matched = null;

        if (card.setCode && card.collectorNumber) {
          matched = foundByKey.get(`${card.setCode}|${card.collectorNumber}`.toLowerCase());
        }
        if (!matched) {
          matched = foundByKey.get(card.name.toLowerCase());
        }

        if (matched) {
          results.push({
            ...mapCardFromScryfall(matched),
            quantity: card.quantity,
          });
        } else {
          // Collection miss — try a single search as fallback
          try {
            const cardData = await fetchCardData(card.name, card.setCode, card.collectorNumber);
            results.push({ ...cardData, quantity: card.quantity });
          } catch (error) {
            errors.push(`${card.name}: ${error.message}`);
            invalidLineIndices.push(absoluteIndex);
          }
        }
      }
    } catch (error) {
      // Whole batch failed — fall back to sequential lookups for this batch
      for (let i = 0; i < batch.length; i += 1) {
        const card = batch[i];
        const absoluteIndex = start + i;
        if (onProgress) {
          onProgress({
            current: absoluteIndex + 1,
            total: cards.length,
            message: `Loading ${card.name}...`,
          });
        }
        try {
          const cardData = await fetchCardData(card.name, card.setCode, card.collectorNumber);
          results.push({ ...cardData, quantity: card.quantity });
        } catch (err) {
          errors.push(`${card.name}: ${err.message}`);
          invalidLineIndices.push(absoluteIndex);
        }
      }
    }
  }

  return { results, errors, invalidLineIndices };
};
