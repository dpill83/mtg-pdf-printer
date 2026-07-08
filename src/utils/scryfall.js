import axios from 'axios';

const SCRYFALL_MIN_REQUEST_INTERVAL_MS = 100;
const SCRYFALL_RETRY_DELAY_MS = 250;
let lastScryfallRequestAt = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetryScryfallRequest = (error) => {
  if (!error) {
    return false;
  }

  if (error.response?.status === 429) {
    return true;
  }

  return !error.response;
};

const getScryfall = async (url, config = {}, retries = 1) => {
  const now = Date.now();
  const waitTime = Math.max(0, SCRYFALL_MIN_REQUEST_INTERVAL_MS - (now - lastScryfallRequestAt));

  if (waitTime > 0) {
    await sleep(waitTime);
  }

  lastScryfallRequestAt = Date.now();

  try {
    return await axios.get(url, config);
  } catch (error) {
    if (retries > 0 && shouldRetryScryfallRequest(error)) {
      await sleep(SCRYFALL_RETRY_DELAY_MS);
      return getScryfall(url, config, retries - 1);
    }

    throw error;
  }
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
        quantity: parseInt(quantity),
        name: cardName.trim(),
        setCode: setCode ? setCode.trim() : null,
        collectorNumber: collectorNumber ? collectorNumber.trim() : null
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
        collectorNumber: null
      });
    }
  }
  return cards;
};



// Fetch card data from Scryfall API
export const fetchCardData = async (cardName, setCode = null, collectorNumber = null) => {
  try {
    let query = `!"${cardName}"`;
    if (setCode && collectorNumber) {
      query += ` set:${setCode} number:${collectorNumber}`;
    } else if (setCode) {
      query += ` set:${setCode}`;
    }
    const response = await getScryfall(`https://api.scryfall.com/cards/search`, {
      params: {
        q: query,
        unique: 'prints',
        order: 'released',
        dir: 'desc'
      }
    });
    if (response.data.data && response.data.data.length > 0) {
      const card = response.data.data[0];
      
      // Handle double-faced cards
      if (card.card_faces && card.card_faces.length > 1) {
        // For double-faced cards, return both faces
        const frontFace = card.card_faces[0];
        const backFace = card.card_faces[1];
        
        return {
          name: card.name,
          imageUrl: frontFace.image_uris?.large,
          backImageUrl: backFace.image_uris?.large,
          set: card.set_name,
          collectorNumber: card.collector_number,
          prints_search_uri: card.prints_search_uri,
          isDoubleFaced: true,
          frontName: frontFace.name,
          backName: backFace.name
        };
      } else {
        // Single-faced card
      const imageUrl = card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large;
      return {
        name: card.name,
        imageUrl: imageUrl,
        set: card.set_name,
        collectorNumber: card.collector_number,
          prints_search_uri: card.prints_search_uri,
          isDoubleFaced: false
      };
      }
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
    // Sort by released_at descending (newest first)
    printings.sort((a, b) => (b.released_at || '').localeCompare(a.released_at || ''));
    
    // Process printings to handle double-faced cards
    return printings.map(printing => {
      if (printing.card_faces && printing.card_faces.length > 1) {
        const frontFace = printing.card_faces[0];
        const backFace = printing.card_faces[1];
        return {
          ...printing,
          imageUrl: frontFace.image_uris?.large,
          backImageUrl: backFace.image_uris?.large,
          isDoubleFaced: true,
          frontName: frontFace.name,
          backName: backFace.name
        };
      } else {
        return {
          ...printing,
          imageUrl: printing.image_uris?.large || printing.card_faces?.[0]?.image_uris?.large,
          isDoubleFaced: false
        };
      }
    });
  } catch (error) {
    throw new Error('Failed to fetch printings');
  }
};

// Fetch multiple cards with error handling and progress tracking
export const fetchMultipleCards = async (cards, onProgress = null) => {
  const results = [];
  const errors = [];
  const invalidLineIndices = [];

  for (let idx = 0; idx < cards.length; idx++) {
    const card = cards[idx];
    
    // Update progress
    if (onProgress) {
      onProgress({
        current: idx + 1,
        total: cards.length,
        message: `Loading ${card.name}...`
      });
    }
    
    try {
      const cardData = await fetchCardData(card.name, card.setCode, card.collectorNumber);
      const cardDataWithQuantity = { ...cardData, quantity: card.quantity };
      results.push(cardDataWithQuantity);
    } catch (error) {
      errors.push(`${card.name}: ${error.message}`);
      invalidLineIndices.push(idx);
    }
  }

  return { results, errors, invalidLineIndices };
}; 