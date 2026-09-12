import React, { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebase'; // Adjust import if needed

const Leaderboard = ({ refreshTrigger, currentScore }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isVisible, setIsVisible] = useState(true); // State to track visibility of leaderboard
  const [isSaving, setIsSaving] = useState(false); // State to track if score is saving to prevent spam

  const fetchLeaderboardData = useCallback(() => {
    const db = getFirestore(app);
    const leaderboardRef = collection(db, 'users');
    const q = query(leaderboardRef, orderBy('score', 'desc'), limit(10));

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeaderboardData(data);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData, refreshTrigger]);

  // Handle validating, prompting, and saving the score inside the component
  const handleSaveScore = async () => {
    if (isSaving) return;

    const db = getFirestore(app);
    
    try {
      // 1. Check if the user already has a saved username in their browser local storage
      let username = localStorage.getItem('trivia_username');

      // 2. If they don't have one, prompt them
      if (!username) {
        let chosenName = prompt("Awesome job! Enter a username (Letters only, no numbers or spaces):");
        
        if (!chosenName || chosenName.trim() === "") {
          alert("Score not saved. A username is required!");
          return;
        }

        const trimmedName = chosenName.trim();

        // Regex validation: Allows ONLY uppercase and lowercase letters
        const letterOnlyRegex = /^[A-Za-z]+$/;

        if (!letterOnlyRegex.test(trimmedName)) {
          alert("Invalid username! Please use letters only (no numbers, spaces, or symbols).");
          return;
        }

        username = trimmedName;
        localStorage.setItem('trivia_username', username);
      }

      setIsSaving(true);

      // 3. Point directly to a specific document named after the user's username
      const userDocRef = doc(db, 'users', username);
      const userSnapshot = await getDoc(userDocRef);

      const incomingScore = Number(currentScore || 0);

      // 4. Overwrite guard: Only update if the document doesn't exist yet,
      // OR if the player's new score beats their old saved record!
      if (!userSnapshot.exists() || incomingScore > (userSnapshot.data().score || 0)) {
        
        await setDoc(userDocRef, {
          username: username,
          score: incomingScore, 
          createdAt: serverTimestamp()
        }, { merge: true }); // Safely merges the variables together

        alert(`Congratulations! New high score of ${incomingScore} locked in for "${username}"!`);
      } else {
        // If they scored less than their personal best, don't overwrite it
        alert(`You scored ${incomingScore}, but your current high score record is ${userSnapshot.data().score}. Keep practicing!`);
      }

    } catch (error) {
      console.error("Error saving score:", error);
      alert("Failed to save score. Please check your internet connection.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle visibility function
  const toggleLeaderboard = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="leaderboard-wrapper">
      {/* Toggle Button */}
      <button className="toggle-leaderboard-button" onClick={toggleLeaderboard}>
        {isVisible ? 'Hide Leaderboard' : 'Show Leaderboard / Save Score'}
      </button>

      {/* Leaderboard Visibility Control */}
      {isVisible && (
        <div className="leaderboard-container">
          <h2>Leaderboard</h2>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((entry, index) => {
                // Determine what to display for the Rank column based on position
                let rankDisplay;
                if (index === 0) {
                  rankDisplay = '🥇'; // 1st Place
                } else if (index === 1) {
                  rankDisplay = '🥈'; // 2nd Place
                } else if (index === 2) {
                  rankDisplay = '🥉'; // 3rd Place
                } else {
                  rankDisplay = index + 1; // 4th place and below get regular numbers
                }

                return (
                  <tr key={entry.id}>
                    <td>{rankDisplay}</td> 
                    <td>{entry.username}</td>
                    <td>{entry.score}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3">
                  {/* Triggers the encapsulated validation and save function */}
                  <button 
                    onClick={handleSaveScore} 
                    className="save-score-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Score'}
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
