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
            {loading ? (
              <span className="spinner" aria-label="Loading"></span>
            ) : 'Load Cards'}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </button>


        </div>
      </form>
    </div>
  );
};

export default DeckInput; 