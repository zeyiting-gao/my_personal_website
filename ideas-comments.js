import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHZhXrVN9ME4LsISnhowBJM5krd3Ea8ck",
  authDomain: "storageforpersonalwebsite.firebaseapp.com",
  projectId: "storageforpersonalwebsite",
  storageBucket: "storageforpersonalwebsite.firebasestorage.app",
  messagingSenderId: "370483740894",
  appId: "1:370483740894:web:2b26ac3ff8fbd8a322024f",
  measurementId: "G-XHXQV3XCED",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const modal = document.getElementById("comment-modal");
const form = modal?.querySelector("form");
const errorEl = modal?.querySelector("[data-error]");
const cancelBtn = modal?.querySelector('[data-action="cancel"]');
const template = document.getElementById("comment-template");

let currentPostId = null;

const formatDate = (value) => {
  if (!value) return "Just now";
  if (typeof value.toDate === "function") return value.toDate().toLocaleString();
  const asDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(asDate.getTime()) ? "Just now" : asDate.toLocaleString();
};

const renderSnapshot = (block, items) => {
  const list = block.querySelector("[data-comments]");
  const empty = block.querySelector("[data-empty]");
  list.innerHTML = "";
  if (!items.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  items.forEach((item) => {
    const node = template.content.cloneNode(true);
    node.querySelector("[data-author]").textContent = item.author || "Anonymous";
    node.querySelector("[data-date]").textContent = formatDate(item.createdAt);
    node.querySelector("[data-text]").textContent = item.text;
    list.appendChild(node);
  });
};

const subscribeToComments = () => {
  document.querySelectorAll(".comment-block").forEach((block) => {
    const postId = block.dataset.postId;
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
    onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => doc.data());
        renderSnapshot(block, items);
      },
      (err) => {
        console.error("Failed to load comments", err);
      }
    );
  });
};

const openModal = (postId) => {
  currentPostId = postId;
  errorEl.hidden = true;
  form.reset();
  modal.showModal();
};

const closeModal = () => {
  currentPostId = null;
  modal.close();
};

const handleSubmit = async (event) => {
  event.preventDefault();
  if (!currentPostId) return;
  const formData = new FormData(form);
  const author = (formData.get("author") || "").toString().trim();
  const text = (formData.get("text") || "").toString().trim();
  if (!author || !text) {
    errorEl.textContent = "Please enter both a name and a comment.";
    errorEl.hidden = false;
    return;
  }

  try {
    await addDoc(collection(db, "posts", currentPostId, "comments"), {
      author,
      text,
      createdAt: serverTimestamp(),
    });
    closeModal();
  } catch (err) {
    console.error("Failed to post comment", err);
    errorEl.textContent = "Could not post right now. Please try again.";
    errorEl.hidden = false;
  }
};

const init = async () => {
  try {
    await signInAnonymously(auth);
  } catch (err) {
    console.error("Anonymous auth failed", err);
  }

  document.querySelectorAll('[data-action="open-comment"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const postId = btn.closest(".comment-block")?.dataset.postId;
      if (postId) openModal(postId);
    });
  });

  cancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  form?.addEventListener("submit", handleSubmit);

  subscribeToComments();
};

init();
