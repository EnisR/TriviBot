import React from 'react';

const difficulties = ['easy', 'medium', 'hard'];

const DifficultySelector = ({ onDifficultySelect }) => {
  return (
    <div className="difficulty-selector">
      {difficulties.map(difficulty => (
        <button
          key={difficulty}
          className="difficulty-button"
          onClick={() => onDifficultySelect(difficulty)}
        >
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default DifficultySelector;
