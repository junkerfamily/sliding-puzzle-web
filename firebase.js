// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJYl_O-Rgf-3c0mFmSc2U1EhLt5CQ6ke4",
  authDomain: "sliding-puzzle-game-48250.firebaseapp.com",
  projectId: "sliding-puzzle-game-48250",
  storageBucket: "sliding-puzzle-game-48250.firebasestorage.app",
  messagingSenderId: "87621162900",
  appId: "1:87621162900:web:680a2c7ebe6d3ddbeba181",
  measurementId: "G-C42CDGCS30"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);