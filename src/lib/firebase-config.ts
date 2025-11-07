// Firebase Configuration for different projects
export const firebaseConfigs = {
  'aptitude-test-x-6d5b5': {
    apiKey: "AIzaSyBjpkElOt5H4hQlTvvVuwC4Sh79wBT1dck",
    authDomain: "aptitude-test-x-6d5b5.firebaseapp.com",
    databaseURL: "https://aptitude-test-x-6d5b5-default-rtdb.firebaseio.com",
    projectId: "aptitude-test-x-6d5b5",
    storageBucket: "aptitude-test-x-6d5b5.firebasestorage.app",
    messagingSenderId: "1010351737990",
    appId: "1:1010351737990:web:0147372fed08f011301507",
    measurementId: "G-PKRPJ1E6N7"
  }
};

// Default configuration (you can change this to switch between projects)
export const defaultProject = 'aptitude-test-x-6d5b5';

// Get the current configuration
export const getFirebaseConfig = () => {
  return firebaseConfigs[defaultProject];
};

// Function to switch between projects
export const switchFirebaseProject = (projectId: keyof typeof firebaseConfigs) => {
  if (firebaseConfigs[projectId]) {
    console.log(`Switching to Firebase project: ${projectId}`);
    return firebaseConfigs[projectId];
  }
  console.warn(`Project ${projectId} not found, using default`);
  return firebaseConfigs[defaultProject];
};
