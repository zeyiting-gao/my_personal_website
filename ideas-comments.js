import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
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
let currentUserId = null;

const modal = document.getElementById("comment-modal");
const form = modal?.querySelector("form");
const errorEl = modal?.querySelector("[data-error]");
const cancelBtn = modal?.querySelector('[data-action="cancel"]');
const template = document.getElementById("comment-template");

let currentPostId = null;
const openStates = new Map();

const formatDate = (value) => {
  if (!value) return "Just now";
  if (typeof value.toDate === "function") return value.toDate().toLocaleString();
  const asDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(asDate.getTime()) ? "Just now" : asDate.toLocaleString();
};

const setBlockOpen = (block, isOpen) => {
  const body = block.querySelector("[data-comment-body]");
  const toggle = block.querySelector('[data-action="toggle-comments"]');
  block.classList.toggle("is-open", isOpen);
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Hide comments" : "Show comments";
  }
  if (body) {
    if (isOpen) {
      body.style.maxHeight = `${body.scrollHeight}px`;
    } else {
      body.style.maxHeight = "0px";
    }
  }
};

const renderSnapshot = (block, items) => {
  const list = block.querySelector("[data-comments]");
  const empty = block.querySelector("[data-empty]");
  list.innerHTML = "";
  if (!items.length) {
    empty.hidden = false;
  } else {
    empty.hidden = true;
    items.forEach((item) => {
      const node = template.content.cloneNode(true);
      node.querySelector("[data-author]").textContent = item.author || "Anonymous";
      node.querySelector("[data-date]").textContent = formatDate(item.createdAt);
      node.querySelector("[data-text]").textContent = item.text;
      const deleteBtn = node.querySelector("[data-delete]");
      if (deleteBtn) {
        if (item.uid && currentUserId && item.uid === currentUserId) {
          deleteBtn.hidden = false;
          deleteBtn.addEventListener("click", async () => {
            try {
              await deleteDoc(doc(db, "posts", item.postId, "comments", item.id));
            } catch (err) {
              console.error("Failed to delete comment", err);
            }
          });
        } else {
          deleteBtn.hidden = true;
        }
      }
      list.appendChild(node);
    });
  }

  const postId = block.dataset.postId;
  const isOpen = openStates.get(postId) === true;
  setBlockOpen(block, isOpen);
};

const subscribeToComments = () => {
  document.querySelectorAll(".comment-block").forEach((block) => {
    const postId = block.dataset.postId;
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
    onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((snap) => ({
          ...snap.data(),
          id: snap.id,
          postId,
        }));
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
      uid: currentUserId,
      createdAt: serverTimestamp(),
    });
    openStates.set(currentPostId, true);
    const block = document.querySelector(`.comment-block[data-post-id="${currentPostId}"]`);
    if (block) setBlockOpen(block, true);
    closeModal();
  } catch (err) {
    console.error("Failed to post comment", err);
    errorEl.textContent = "Could not post right now. Please try again.";
    errorEl.hidden = false;
  }
};

const init = async () => {
  try {
    const result = await signInAnonymously(auth);
    currentUserId = result.user?.uid || null;
  } catch (err) {
    console.error("Anonymous auth failed", err);
  }

  document.querySelectorAll('[data-action="open-comment"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const postId = btn.closest(".comment-block")?.dataset.postId;
      if (postId) openModal(postId);
    });
  });

  document.querySelectorAll('[data-action="toggle-comments"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const block = btn.closest(".comment-block");
      if (!block) return;
      const postId = block.dataset.postId;
      const nextState = !(openStates.get(postId) === true);
      openStates.set(postId, nextState);
      setBlockOpen(block, nextState);
    });
  });

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  modal?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModal();
  });

  cancelBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  form?.addEventListener("submit", handleSubmit);

  window.addEventListener("resize", () => {
    document.querySelectorAll(".comment-block.is-open").forEach((block) => {
      const body = block.querySelector("[data-comment-body]");
      if (body) body.style.maxHeight = `${body.scrollHeight}px`;
    });
  });

  subscribeToComments();
};

init();
