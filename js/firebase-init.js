// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnEdUj6OnxyiA3l4PHsuXS909a4w0r4FQ",
    authDomain: "pharmacy-management-syst-c9dda.firebaseapp.com",
    projectId: "pharmacy-management-syst-c9dda",
    storageBucket: "pharmacy-management-syst-c9dda.firebasestorage.app",
    messagingSenderId: "291189198221",
    appId: "1:291189198221:web:8e0068cc11cd0389d341c4",
    measurementId: "G-LBW7W9CYWE"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, analytics };
