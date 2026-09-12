import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Add this if you're using Firestore

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYj8XTUMs-jKfigFQ_KPzsUTX5jREAugE",
  authDomain: "trivibot-3b295.firebaseapp.com",
  projectId: "trivibot-3b295",
  storageBucket: "trivibot-3b295.appspot.com",
  messagingSenderId: "1095296639662",
  appId: "1:1095296639662:web:cf5225d260b32d8fc1433f",
  measurementId: "G-B6MHLBCZCC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export both app and db
export { app, db };
