// ============================================================
// سَرْمَد — إعدادات Firebase المشتركة (تُستورد في كل الملفات)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, FacebookAuthProvider, signInWithPopup,
  sendPasswordResetEmail, sendEmailVerification, updateProfile, signOut, signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, getDocs, query, where, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDwo9ylUI7cq7DodekA0vM7iMw-6COp3BI",
  authDomain: "saemad-8a204.firebaseapp.com",
  projectId: "saemad-8a204",
  storageBucket: "saemad-8a204.firebasestorage.app",
  messagingSenderId: "676932025599",
  appId: "1:676932025599:web:0076ca1cabc132883a60ca",
  measurementId: "G-JXTFZ6LGMQ"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  FacebookAuthProvider, signInWithPopup, sendPasswordResetEmail, sendEmailVerification, updateProfile, signOut,
  signInAnonymously,
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs,
  query, where, orderBy, serverTimestamp, onSnapshot
};

// ============================================================
// ثوابت التطبيق العامة
// ============================================================
export const APP = {
  name_hidden: true, // اللوجو فقط، بدون كتابة اسم التطبيق
  logoUrl: "https://i.ibb.co/PZsJ4ptx/logo.png",
  iconUrl: "https://i.ibb.co/CyBhgJ0/icon.png",
  contactEmail: "contact@sarmad.qd.je",
  linkedin: "https://www.linkedin.com/in/khaled-ahmed-241002386",
  imgbbKey: "36b0e2658ed6fad2ca48081442f1539b",
  paypalClientId: "AW_M1acPABnrPp2AJklYALUDZ1OUA2NS6CPGp3D3ZB9fVIfmfD87le9WZmHF3fOCqINDO3RAtQGWLteZ",
  adminEmail: "soudadteam@gmail.com",
  adminPin: "9033",
};

// ============================================================
// أدوات مساعدة عامة
// ============================================================
export function esc(str){
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

export function toast(msg, ms = 2600){
  let host = document.getElementById("toast-host");
  if (!host){
    host = document.createElement("div");
    host.id = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function fmtDuration(totalSeconds){
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2,"0")}`;
}

export function fmtDate(ts){
  try{
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ar-EG", { year:"numeric", month:"long", day:"numeric" });
  }catch(e){ return ""; }
}

export function uid8(){
  return Math.random().toString(36).slice(2,10);
}

export async function uploadToImgbb(file){
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${APP.imgbbKey}`, {
    method: "POST", body: fd
  });
  const data = await res.json();
  if (!data.success) throw new Error("فشل رفع الصورة");
  return data.data.url;
}

// حماية عامة من النسخ والنقر بزر الفأرة الأيمن وسحب الصور والفيديو
export function applyContentProtection(){
  document.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".allow-context")) return;
    e.preventDefault();
  });
  document.addEventListener("copy", (e) => {
    if (e.target.closest(".allow-copy")) return;
    e.preventDefault();
  });
  document.addEventListener("dragstart", (e) => {
    if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO"){
      if (!e.target.closest(".allow-context")) e.preventDefault();
    }
  });
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["s","u","p"].includes(k)){
      e.preventDefault();
    }
  });
}

export function registerSW(){
  if ("serviceWorker" in navigator){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}
