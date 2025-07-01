import axios from 'axios';

// Parse decklist text into card objects
export const parseDecklist = (decklistText) => {
  const lines = decklistText.trim().split('\n');
  const cards = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match patterns like "1x Lightning Bolt (2XM) 123" or "1 Lightning Bolt"
    const match = trimmedLine.match(/^(\d+)(?:x\s*)?(.+?)(?:\s*\(([^)]+)\))?(?:\s+(\d+))?$/);
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

// Test function to verify API is working
export const testScryfallAPI = async () => {
  try {
    console.log('Testing Scryfall API...');
    
    // Test 1: Simple card search
    const response1 = await axios.get('https://api.scryfall.com/cards/search', {
      params: { q: '!"Lightning Bolt"', unique: 'cards' }
    });
    console.log('Test 1 (Lightning Bolt):', response1.data.data.length, 'results');
    
    // Test 2: Set-specific search
    const response2 = await axios.get('https://api.scryfall.com/cards/search', {
      params: { q: '!"Lightning Bolt" set:M11', unique: 'cards' }
    });
    console.log('Test 2 (Lightning Bolt M11):', response2.data.data.length, 'results');
    
    // Test 3: Counterspell search
    const response3 = await axios.get('https://api.scryfall.com/cards/search', {
      params: { q: '!"Counterspell"', unique: 'cards' }
    });
    console.log('Test 3 (Counterspell):', response3.data.data.length, 'results');
    
    return true;
  } catch (error) {
    console.error('API test failed:', error.response?.status, error.response?.statusText);
    return false;
  }
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
    const response = await axios.get(`https://api.scryfall.com/cards/search`, {
      params: {
        q: query,
        unique: 'prints',
        order: 'released',
        dir: 'desc'
      }
    });
    if (response.data.data && response.data.data.length > 0) {
      const card = response.data.data[0];
      const imageUrl = card.image_uris?.png || card.card_faces?.[0]?.image_uris?.png;
      return {
        name: card.name,
        imageUrl: imageUrl,
        set: card.set_name,
        collectorNumber: card.collector_number,
        prints_search_uri: card.prints_search_uri
      };
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
      const response = await axios.get(nextPage);
      if (response.data.data && response.data.data.length > 0) {
        printings.push(...response.data.data);
      }
      nextPage = response.data.has_more ? response.data.next_page : null;
    }
    // Sort by released_at descending (newest first)
    printings.sort((a, b) => (b.released_at || '').localeCompare(a.released_at || ''));
    return printings;
  } catch (error) {
    throw new Error('Failed to fetch printings');
  }
};

// Fetch multiple cards with error handling
export const fetchMultipleCards = async (cards) => {
  const results = [];
  const errors = [];
  const invalidLineIndices = [];

  for (let idx = 0; idx < cards.length; idx++) {
    const card = cards[idx];
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