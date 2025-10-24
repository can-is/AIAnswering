/**
 * Firebase Admin Login
 * ---------------------
 * - Google Sign-In popup
 * - Stores ID token in localStorage
 * - Redirects to index.html after success
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.getElementById("googleLogin").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const token = await user.getIdToken();

    localStorage.setItem("idToken", token);
    localStorage.setItem("userEmail", user.email);

    console.log("✅ Login success:", user.email);
    window.location.href = "/index.html";
  } catch (error) {
    console.error("❌ Login failed:", error);
    alert("Login failed. Try again.");
  }
});
