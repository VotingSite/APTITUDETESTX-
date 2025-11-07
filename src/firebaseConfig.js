// src/firebaseConfig.js

// Import the functions you need from the Firebase SDKs
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjpkElOt5H4hQlTvvVuwC4Sh79wBT1dck",
  authDomain: "aptitude-test-x-6d5b5.firebaseapp.com",
  databaseURL: "https://aptitude-test-x-6d5b5-default-rtdb.firebaseio.com",
  projectId: "aptitude-test-x-6d5b5",
  storageBucket: "aptitude-test-x-6d5b5.firebasestorage.app",
  messagingSenderId: "1010351737990",
  appId: "1:1010351737990:web:0147372fed08f011301507",
  measurementId: "G-PKRPJ1E6N7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and export it
export const db = getDatabase(app);
export default app;
