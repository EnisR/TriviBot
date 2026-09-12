import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Howl } from 'howler';
import './App.css';
import CategorySelector, { categories } from './CategorySelector'; // Import categories
import DifficultySelector from './DifficultySelector';
import ChatMessages from './ChatMessages';
import { decode } from 'html-entities';
import { db } from './firebase'; // Import Firestore instance
import { collection, addDoc } from 'firebase/firestore';
import Leaderboard from './Leaderboard'; 

const App = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0); // Tracks consecutive correct answers
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [hasStartedQuiz, setHasStartedQuiz] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hint, setHint] = useState('');
  const [timer, setTimer] = useState(30); // Timer starts at 30 seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
  const isFetchingRef = useRef(false); // mirrors isFetchingQuestion for use inside useCallback without changing its identity
  const [eliminatedOptions, setEliminatedOptions] = useState([]);
  const [hintUsed, setHintUsed] = useState(false);
  const correctSound = new Howl({ src: ['/correct.mp3'] });
  const incorrectSound = new Howl({ src: ['/incorrect.mp3'] });

  useEffect(() => {
    setChatHistory([
      { text: "Hi, I am TriviBot. Do you want to test your knowledge?", isBot: true }
    ]);
  }, []);

  // Function to get category name from ID
  const getCategoryName = (id) => {
    const categoryObj = categories.find(cat => cat.id === id);
    return categoryObj ? categoryObj.name : 'Unknown';
  };

const fetchQuestion = useCallback(async (isRetry = false) => {
    if (!category || !hasStartedQuiz) return;
    // Guard against overlapping calls (e.g. rapid double-clicks on "Change Question")
    if (isFetchingRef.current && !isRetry) return;

    isFetchingRef.current = true;
    setIsFetchingQuestion(true);
    console.log(`Fetching question for category: ${category} and difficulty: ${difficulty}`); // Debugging

    try {
      const response = await axios.get(`https://opentdb.com/api.php?amount=1&category=${category}&difficulty=${difficulty}`);

      // OpenTDB rate-limits to 1 request/5s per IP. When that happens it returns
      // response_code 5 (or an empty results array) instead of an HTTP error, so we
      // have to check it explicitly and retry automatically instead of failing silently.
      if (response.data.response_code !== 0 || !response.data.results?.length) {
        if (!isRetry) {
          setChatHistory(prev => [
            ...prev,
            { text: 'One sec, fetching the next question…', isBot: true }
          ]);
        }
        // Keep the fetching flag set while we wait so the button stays disabled
        // and nothing else can trigger an overlapping request during the wait.
        setTimeout(() => fetchQuestion(true), 5500);
        return;
      }

      const data = response.data.results[0];
      const questionText = decode(data.question);
      const formattedQuestion = (
        <span>
          <b>Question:</b> {questionText}
        </span>
      );

      setQuestion(questionText);

      // 1. Combine incorrect answers and correct answer into a single raw options array
      const rawOptions = [...data.incorrect_answers, data.correct_answer];

      // 2. Decode every single string element inside that array BEFORE sorting
      const decodedOptions = rawOptions.map(option => decode(option));

      // 3. Sort them alphabetically so the layout remains uniform
      setOptions(decodedOptions.sort());

      // 4. Decode the correct answer state so it perfectly matches the button string layout
      setCorrectAnswer(decode(data.correct_answer));
      
      setHint(''); // Reset hint
      setEliminatedOptions([]); // Reset 50/50 eliminations for the new question
      setHintUsed(false); // Allow the hint to be used again

      // Add formatted question to chat history
      setChatHistory(prev => [...prev, { text: formattedQuestion, isBot: true }]);
      setTimer(30); // Reset timer
      setIsTimerRunning(true); // Start timer
      isFetchingRef.current = false;
      setIsFetchingQuestion(false);
    } catch (error) {
      console.error('Error fetching trivia question:', error);
      setChatHistory(prev => [
        ...prev,
        { text: 'Sorry, I had trouble fetching a question. Please try "Change Question" again.', isBot: true }
      ]);
      isFetchingRef.current = false;
      setIsFetchingQuestion(false);
    }
  }, [category, difficulty, hasStartedQuiz]);


    useEffect(() => {
    if (category && hasStartedQuiz) {
      fetchQuestion();
      setChatHistory([]);
    }
  }, [category, hasStartedQuiz]); // Only track these two!


  useEffect(() => {
    if (isTimerRunning) {
      const countdown = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            clearInterval(countdown);
            handleTimerExpiration();
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [isTimerRunning]);

  const handleButtonClick = (action) => {
    if (action === 'let\'s start') {
      setHasStartedQuiz(true);
      setChatHistory(prev => [
        ...prev,
        { text: 'Great! Please choose a category by clicking one of the buttons below.', isBot: true }
      ]);
    } else if (action === 'not yet') {
      setChatHistory(prev => [
        ...prev,
        { text: 'No problem! Let me know when you’re ready to start.', isBot: true }
      ]);
    } else if (action === 'change category') {
      setCategory('');
      setQuestion('');
      setOptions([]);
      setHint('');
      setEliminatedOptions([]);
      setHintUsed(false);
      setTimer(30); // Reset timer
      setIsTimerRunning(false); // Stop the timer
      setChatHistory([]);
      setChatHistory(prev => [
        ...prev,
        { text: 'Sure! Please choose a new category by clicking one of the buttons below.', isBot: true }
      ]);
    } else if (action === 'change question') {
      fetchQuestion();
      setChatHistory([]);
    } else if (action === 'reset') {
      setCategory('');
      setQuestion('');
      setOptions([]);
      setCorrectAnswer('');
      setScore(0);
      setHasStartedQuiz(false);
      setHint('');
      setEliminatedOptions([]);
      setHintUsed(false);
      setTimer(30); // Reset timer
      setIsTimerRunning(false); // Stop the timer
      setChatHistory([
        { text: "Hi, I am TriviBot. Do you want to test your knowledge?", isBot: true }
      ]);
    }
  };

  const handleUserInput = (e) => {
    e.preventDefault();

    // Add the user's input as a new chat message on the right side
    setChatHistory((prev) => [
      ...prev,
      { text: userInput, isBot: false },  // User input message
    ]);

    if (question && options.includes(userInput)) {
      handleAnswer(userInput);
    } else {
      setChatHistory((prev) => [
        ...prev,
        { text: `Sorry, I didn't understand "${userInput}".`, isBot: true }
      ]);
    }

    setUserInput('');
  };

    const handleAnswer = async (answer) => {
    // Stop the countdown the moment an answer is submitted, otherwise it keeps
    // running in the background and fires "Time's up!" on top of the fun fact.
    setIsTimerRunning(false);

    // Display user's selected answer
    setChatHistory((prev) => [
      ...prev,
      { text: answer, isBot: false }  // User selected answer message
    ]);

    let basePoints = 1;
    if (difficulty === 'medium') basePoints = 2;
    if (difficulty === 'hard') basePoints = 3;

    let isCorrect = answer === correctAnswer;
    let currentTotalScore = score;

    if (isCorrect) {
      // 1. Calculate the new streak
      const newStreak = streak + 1;
      setStreak(newStreak);

      // 2. Base points get multiplied by the streak level (e.g., x1, x2, x3...)
      const earnedPoints = basePoints * newStreak;
      currentTotalScore = score + earnedPoints;
      setScore(currentTotalScore);

      // 3. Print a hype message into the chat showing their streak!
      let streakMessage = `Correct! Your score is now ${currentTotalScore}.`;
      if (newStreak >= 2) {
        streakMessage += ` 🔥 On a ${newStreak}-question streak! (+${earnedPoints} pts)`;
      }

      setChatHistory((prev) => [
        ...prev,
        { text: streakMessage, isBot: true }
      ]);
      correctSound.play(); // Play correct answer sound
    } else {
      // 4. Reset streak to 0 immediately if they guess wrong
      setStreak(0);
      setChatHistory((prev) => [
        ...prev,
        { text: `Wrong answer. The correct answer was: ${correctAnswer}.`, isBot: true }
      ]);
      incorrectSound.play(); // Play incorrect answer sound
    }

    // Fetch and display a fun fact related to the question
    const funFact = await fetchFunFact(question);
    setChatHistory(prev => [
      ...prev,
      { text: `Fun fact: ${funFact}`, isBot: true }
    ]);

    // Wait exactly 5 seconds before pulling down the next question (REMOVED setChatHistory([]) so it doesn't wipe)
    setTimeout(() => {
      setChatHistory([]); // 1. Wipes the old chat history screen clean
      fetchQuestion();    // 2. Loads the new question onto the fresh blank screen
    }, 5000);
  };


  const showHint = () => {
    if (!correctAnswer || hintUsed) return;

    // 50/50: randomly remove two of the wrong options, leaving the correct
    // answer plus one wrong option for the user to choose between.
    const wrongOptions = options.filter(option => option !== correctAnswer);
    const shuffled = [...wrongOptions].sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, Math.max(wrongOptions.length - 1, 0));

    setEliminatedOptions(toEliminate);
    setHint('Two wrong answers removed!');
    setHintUsed(true);
  };

  const handleTimerExpiration = () => {
    setIsTimerRunning(false);
    setChatHistory(prev => [
      ...prev,
      { text: `Time's up! The correct answer was: ${correctAnswer}.`, isBot: true }
    ]);
    incorrectSound.play(); // Play incorrect answer sound when time's up
    setTimeout(() => {
      fetchQuestion();
    }, 2000);
  };

      const fetchFunFact = async (queryText) => {
    try {
      // 1. Search for the most accurate Wikipedia Page Title matching the question
      // FIX: Changed URL to the official API endpoint
      const searchResponse = await axios.get(`https://en.wikipedia.org/w/api.php`, {
        params: {
          action: 'query',
          format: 'json',
          list: 'search',
          srsearch: queryText,
          origin: '*'
        }
      });

      const searchResults = searchResponse.data.query.search;
      
      if (searchResults && searchResults.length > 0) {
        // KEPT YOUR FIX: Correctly maps to the first result in the array
        const pageTitle = searchResults[0].title;

        // 2. Precise call to get a clean, full-sentence text summary of that page
        // FIX: Changed URL to the official API endpoint
        const extractResponse = await axios.get(`https://en.wikipedia.org/w/api.php`, {
          params: {
            action: 'query',
            format: 'json',
            prop: 'extracts',
            exintro: true,
            explaintext: true, // Removes HTML elements entirely
            exsentences: 2,    // Restricts the output to exactly 2 complete sentences
            titles: pageTitle,
            origin: '*'
          }
        });

        const pages = extractResponse.data.query.pages;
        // KEPT YOUR FIX: Correctly targets the first object key index
        const pageId = Object.keys(pages)[0]; 
        const fullCleanText = pages[pageId].extract;

        if (fullCleanText && fullCleanText.trim() !== "") {
          return fullCleanText;
        }
      }
      return 'Trivia is full of amazing historical connections!';
    } catch (error) {
      console.error('Error fetching fun fact:', error);
      return 'Did you know? This topic has a rich history studied worldwide.';
    }
  };



  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const saveScore = async () => {
    const username = window.prompt("Enter your username to save your score:");

    if (username) {
      try {
        await addDoc(collection(db, 'users'), {
          username: username,
          score: score
        });
        alert('Score saved successfully!');
      } catch (error) {
        console.error('Error saving score:', error);
        // Surface the real Firestore error (e.g. "permission-denied") instead of a
        // generic message, since that's the fastest way to diagnose what's wrong
        // in the Firebase console (security rules, quota, etc.).
        alert(`Failed to save score: ${error.code || error.message}`);
      }
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="wrapper">
      <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
        <button className="theme-toggle" onClick={toggleTheme}>
          {isDarkMode ? 'Switch to Classic Mode' : 'Switch to Dark Mode'}
        </button>
        <Leaderboard currentScore={score} refreshTrigger={refreshTrigger} />

        <div className="chat-container">
          <div className="chat-header">
            <img src="logo.png" alt="Chatbot Logo" className="chat-logo" />
            <h1>TriviBot</h1>
            <div className="score-container">
              <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0' }}>
                <span>Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                <span>Score: {score}</span>
                {/* NEW: Live streak display right in the header! */}
                    {streak >= 2 && (
                      <span className="streak-badge" style={{ color: '#ff4500', fontWeight: 'bold' }}>
                        🔥 Streak: {streak}x
                      </span>
                    )}  
                <span>Category: {getCategoryName(category)}</span>
              </p>
            </div>
          </div>
          <ChatMessages chatHistory={chatHistory} />
  
          <div className="button-container">
            {!hasStartedQuiz && category === '' && (
              <div className="initial-buttons">
                <button onClick={() => handleButtonClick('let\'s start')}>
                  Let's Start
                </button>  
              </div>
            )}
            {hasStartedQuiz && category === '' && (
              <div className="selectors-container">
                <div className="difficulty-selector">
                  <DifficultySelector onDifficultySelect={setDifficulty} />
                </div>
                <div className="category-selector">
                  <CategorySelector onCategorySelect={setCategory} />
                </div>
              </div>
            )}
            {question && (
              <div className="question-container">
                {/* Hint Button */}
                <div className="hint-container">
                  <button className="hint-button" onClick={showHint} disabled={hintUsed}>
                    <img src="hint.png" alt="50/50 Hint" className="hint-image" />
                  </button>
                  {hint && <div className="hint-text">{hint}</div>}
                </div>
                <div className="answer-options">
                  {options
                    .filter(option => !eliminatedOptions.includes(option))
                    .map((option, index) => (
                      <button key={index} onClick={() => handleAnswer(option)}>
                        {option}
                      </button>
                    ))}
                </div>
                <div className="extra-options">
                  <button
                    onClick={() => handleButtonClick('change question')}
                    disabled={isFetchingQuestion}
                  >
                    {isFetchingQuestion ? 'Loading…' : 'Change Question'}
                  </button>
                  <button onClick={() => handleButtonClick('change category')}>
                    Change Category
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Always visible reset button */}
          <button className="reset-button" onClick={() => handleButtonClick('reset')}>
            Reset
          </button>
          {/* Ensure this form is at the bottom of the chat container */}
          {(question || hasStartedQuiz) && (
            <form onSubmit={handleUserInput} className="answer-input-form">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="answer-input"
                placeholder="Type your answer..."
              />
              <button type="submit" className="send-button">Send</button>
            </form>
          )}
        </div>
        <div className="timer-container">
          {isTimerRunning && <div className="timer">Time left: {timer} seconds</div>}
        </div>
      </div>
    </div>
  );
}  

export default App;