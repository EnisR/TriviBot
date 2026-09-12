import React from 'react';

export const categories = [
  { id: 9, name: 'General Knowledge' },
  { id: 17, name: 'Science & Nature' },
  { id: 18, name: 'Computers' },
  { id: 21, name: 'Sports' },
  { id: 22, name: 'Geography' }
  
    // case 10: return "Entertainment: Books";
    // case 11: return "Entertainment: Film";
    // case 12: return "Entertainment: Music";
    // case 21: return "Sports";
    // case 23: return "History";
    // case 24: return "Politics";
    // case 25: return "Art";
    // default: return "Unknown Category";
];

const CategorySelector = ({ onCategorySelect }) => {
  return (
    <div className="category-selector">
      {categories.map(category => (
        <button
          key={category.id}
          className="category-button"
          onClick={() => onCategorySelect(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

export default CategorySelector;

