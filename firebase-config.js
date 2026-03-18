// Firebase konfiqurasiyası - ÖZ MƏLUMATLARINIZI YAZIN
const firebaseConfig = {
    apiKey: "AIzaSyBcBmOzXxXxXxXxXxXxXxXxXxXxXxXxXx",
    authDomain: "quiz-game-xxxxx.firebaseapp.com",
    projectId: "quiz-game-xxxxx",
    storageBucket: "quiz-game-xxxxx.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:xxxxxxxxxxxxxxxx"
};

// Firebase-i başlat
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('✅ Firebase başladıldı');
} catch (error) {
    console.error('❌ Firebase xətası:', error);
}

// Firebase obyektlərini qlobal et
window.db = db;
window.firebase = firebase;
