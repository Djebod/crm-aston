// Firebase di BROWSER — hanya untuk login Google (project aston-cirebon,
// sama dengan Portal Staff). Konfigurasi web Firebase memang boleh publik;
// keamanan dijaga verifikasi ID token di server (/api/login).
import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const KONFIG = {
  apiKey: "AIzaSyCtchsoXQdSr-KU8RsG0vHvG678zFe249k",
  authDomain: "aston-cirebon.firebaseapp.com",
  projectId: "aston-cirebon",
  storageBucket: "aston-cirebon.firebasestorage.app",
  messagingSenderId: "791684466111",
  appId: "1:791684466111:web:08e3af52ca7b14a5b44d0a",
};

let _auth = null;

export function ambilAuth() {
  if (_auth) return _auth;
  const app = getApps().length ? getApps()[0] : initializeApp(KONFIG);
  _auth = getAuth(app);
  return _auth;
}

export function ambilGoogleProvider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  return p;
}
