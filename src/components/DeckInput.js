import React, { useState } from 'react';
import './DeckInput.css';

const DeckInput = ({ onDeckSubmit, loading }) => {
  const [decklist, setDecklist] = useState('');
  const [errors, setErrors] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors([]);
    
    if (!decklist.trim()) {
      setErrors(['Please enter a decklist']);
      return;
    }
    
    onDeckSubmit(decklist);
  };

  const handleClear = () => {
    setDecklist('');
    setErrors([]);
  };

  const handleExample = () => {
    const exampleDeck = `4x Lightning Bolt (M11) 146
4x Counterspell (M10) 58
4x Brainstorm (C21) 85
4x Ponder (M12) 74
4x Preordain (M11) 66
4x Delver of Secrets (ISD) 51
4x Snapcaster Mage (ISD) 74
4x Young Pyromancer (M14) 172
4x Monastery Swiftspear (KTK) 134
4x Eidolon of the Great Revel (BNG) 100
4x Sulfuric Vortex (SCG) 95
4x Price of Progress (EXO) 127
4x Fireblast (VIS) 123
4x Chain Lightning (LEG) 95
4x Lava Spike (CHK) 175
4x Rift Bolt (TSP) 165
4x Searing Blaze (ROE) 136
4x Smash to Smithereens (M10) 150
4x Pyroblast (ICE) 108
4x Red Elemental Blast (3ED) 127`;
    
    setDecklist(exampleDeck);
  };

  const handleSimpleExample = () => {
    const simpleDeck = `4x Lightning Bolt
4x Counterspell
4x Brainstorm
4x Ponder
4x Preordain
4x Delver of Secrets
4x Snapcaster Mage
4x Young Pyromancer
4x Monastery Swiftspear
4x Eidolon of the Great Revel`;
    
    setDecklist(simpleDeck);
  };

  return (
    <div className="deck-input-container">
      <form onSubmit={handleSubmit}>
        <div className="input-header">
          <h2>Enter Your Decklist</h2>
          <p>Paste your Magic: The Gathering decklist below (one card per line)</p>
          <p className="format-example">
            Format: "1x Lightning Bolt (M11) 146" or "1 Lightning Bolt"
          </p>
        </div>
        
        <div className="textarea-container">
          <textarea
            value={decklist}
            onChange={(e) => setDecklist(e.target.value)}
            placeholder="4x Lightning Bolt (M11) 146&#10;4x Counterspell (M10) 58&#10;4x Brainstorm (C21) 85&#10;..."
            disabled={loading}
            rows={12}
            className="decklist-textarea"
          />
        </div>
        
        {errors.length > 0 && (
          <div className="error">
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
        
        <div className="button-group">
          <button
            type="submit"
            className="btn btn-success"
            disabled={loading || !decklist.trim()}
          >
            {loading ? (<span className="spinner" role="status" aria-label="Loading">🔄</span>) : null}
            {loading ? ' Loading Cards...' : 'Load Cards'}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </button>
          
          {/*
          <button
            type="button"
            className="btn"
            onClick={handleSimpleExample}
            disabled={loading}
          >
            Load Simple Example
          </button>
          
          <button
            type="button"
            className="btn"
            onClick={handleExample}
            disabled={loading}
          >
            Load Full Example
          </button>
          */}
        </div>
      </form>
    </div>
  );
};

export default DeckInput; 