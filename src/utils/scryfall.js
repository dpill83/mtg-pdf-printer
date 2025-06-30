import axios from 'axios';

// Parse decklist text into card objects
export const parseDecklist = (decklistText) => {
  const lines = decklistText.trim().split('\n');
  const cards = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match patterns like "1x Lightning Bolt (2XM) 123" or "1 Lightning Bolt"
    const match = trimmedLine.match(/^(\d+)(?:x\s*)?(.+?)(?:\s*\(([^)]+)\))?(?:\s+\d+)?$/);
    
    if (match) {
      const [, quantity, cardName, setCode] = match;
      cards.push({
        quantity: parseInt(quantity),
        name: cardName.trim(),
        setCode: setCode ? setCode.trim() : null
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
export const fetchCardData = async (cardName, setCode = null) => {
  try {
    // Always try name-only search first (most reliable)
    console.log(`Searching for: !"${cardName}"`);
    
    const response = await axios.get(`https://api.scryfall.com/cards/search`, {
      params: {
        q: `!"${cardName}"`,
        unique: 'cards'
      }
    });

    if (response.data.data && response.data.data.length > 0) {
      const card = response.data.data[0];
      const imageUrl = card.image_uris?.png || card.card_faces?.[0]?.image_uris?.png;
      
      console.log(`Found ${cardName} in set ${card.set_name}`);
      
      return {
        name: card.name,
        imageUrl: imageUrl,
        set: card.set_name,
        collectorNumber: card.collector_number
      };
    }
    
    throw new Error(`Card not found: ${cardName}`);
  } catch (error) {
    console.error(`Error fetching card ${cardName}:`, error.response?.status, error.response?.statusText);
    throw new Error(`Card not found: ${cardName}`);
  }
};

// Fetch multiple cards with error handling
export const fetchMultipleCards = async (cards) => {
  const results = [];
  const errors = [];

  for (const card of cards) {
    try {
      const cardData = await fetchCardData(card.name, card.setCode);
      // Add the card multiple times based on quantity
      for (let i = 0; i < card.quantity; i++) {
        results.push(cardData);
      }
    } catch (error) {
      errors.push(`${card.name}: ${error.message}`);
    }
  }

  return { results, errors };
}; 