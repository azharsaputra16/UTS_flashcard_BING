
/* ==========================================
   WORDLY - FIREBASE + FLASHCARD
   Kosakata bawaan tidak dapat diubah pengguna.
   Data pribadi disimpan per akun Firebase.
   ========================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDwfxTr3XKQwC-m1wfDjofptzvX95MEWy4",
    authDomain: "flashcard-b7510.firebaseapp.com",
    projectId: "flashcard-b7510",
    storageBucket: "flashcard-b7510.firebasestorage.app",
    messagingSenderId: "1039400935278",
    appId: "1:1039400935278:web:4f5af333d6d2d97481eb7f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

/* ==========================================
   24 KOSAKATA BAWAAN
   Data ini bersifat tetap dan hanya dibaca.
   ========================================== */

const defaultCards = [
    ["Book", "Buku", "Benda", "/bʊk/", "This is my book.", "Ini buku saya.", "📚"],
    ["Chair", "Kursi", "Benda", "/tʃer/", "Sit on the chair.", "Duduklah di kursi.", "🪑"],
    ["Table", "Meja", "Benda", "/ˈteɪ.bəl/", "The cup is on the table.", "Cangkir ada di atas meja.", "🪵"],
    ["Door", "Pintu", "Benda", "/dɔːr/", "Please close the door.", "Tolong tutup pintunya.", "🚪"],
    ["Window", "Jendela", "Benda", "/ˈwɪn.doʊ/", "Open the window, please.", "Tolong buka jendelanya.", "🪟"],
    ["House", "Rumah", "Benda", "/haʊs/", "My house is small.", "Rumah saya kecil.", "🏠"],
    ["Water", "Air", "Benda", "/ˈwɔː.tər/", "I drink water every day.", "Saya minum air setiap hari.", "💧"],
    ["Food", "Makanan", "Benda", "/fuːd/", "The food is delicious.", "Makanannya lezat.", "🍚"],
    ["Friend", "Teman", "Benda", "/frend/", "She is my friend.", "Dia teman saya.", "🧑‍🤝‍🧑"],
    ["School", "Sekolah", "Benda", "/skuːl/", "I go to school.", "Saya pergi ke sekolah.", "🏫"],
    ["Eat", "Makan", "Kerja", "/iːt/", "I eat rice.", "Saya makan nasi.", "🍽️"],
    ["Drink", "Minum", "Kerja", "/drɪŋk/", "I drink milk.", "Saya minum susu.", "🥛"],
    ["Read", "Membaca", "Kerja", "/riːd/", "I read a book.", "Saya membaca buku.", "📖"],
    ["Write", "Menulis", "Kerja", "/raɪt/", "Please write your name.", "Tolong tulis namamu.", "✍️"],
    ["Sleep", "Tidur", "Kerja", "/sliːp/", "I sleep at ten.", "Saya tidur pukul sepuluh.", "😴"],
    ["Walk", "Berjalan", "Kerja", "/wɔːk/", "We walk to the park.", "Kami berjalan ke taman.", "🚶"],
    ["Happy", "Senang / bahagia", "Sifat", "/ˈhæp.i/", "I am happy today.", "Saya senang hari ini.", "😊"],
    ["Sad", "Sedih", "Sifat", "/sæd/", "He looks sad.", "Dia terlihat sedih.", "😢"],
    ["Big", "Besar", "Sifat", "/bɪɡ/", "That is a big house.", "Itu rumah yang besar.", "🐘"],
    ["Small", "Kecil", "Sifat", "/smɔːl/", "I have a small bag.", "Saya punya tas kecil.", "🎒"],
    ["Beautiful", "Cantik / indah", "Sifat", "/ˈbjuː.tɪ.fəl/", "The flower is beautiful.", "Bunga itu indah.", "🌸"],
    ["Thank you", "Terima kasih", "Sehari-hari", "/θæŋk juː/", "Thank you for your help.", "Terima kasih atas bantuanmu.", "🙏"],
    ["Good morning", "Selamat pagi", "Sehari-hari", "/ɡʊd ˈmɔːr.nɪŋ/", "Good morning, everyone!", "Selamat pagi, semuanya.", "🌅"],
    ["How are you?", "Apa kabar?", "Sehari-hari", "/haʊ ɑːr juː/", "Hi, how are you?", "Hai, apa kabar?", "👋"]
].map((v, i) => ({
    id: "default_" + i,
    question: v[0],
    answer: v[1],
    category: v[2],
    pronunciation: v[3],
    example: v[4],
    translation: v[5],
    emoji: v[6],
    source: "default",
    known: false
}));

/* ==========================================
   STATE APLIKASI
   ========================================== */

let currentUser = null;
let cards = [];
let myWords = [];
let referenceWords = [];
const addingReferenceIds = new Set();
const deletingWordIds = new Set();
let unsubscribeReferenceWords = null;
let progress = {};
let currentIndex = 0;
let isFlipped = false;
let searchText = "";
let selectedCategory = "Semua";
let activePage = "learn-page";
let authMode = "login";
let loadingData = false;

const $ = id => document.getElementById(id);

function showMessage(id, message, isError = true) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? "var(--red)" : "var(--green)";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function userCollection(name) {
    if (!currentUser) throw new Error("Silakan login terlebih dahulu.");
    return db.collection("users").doc(currentUser.uid).collection(name);
}

function getProgress(card) {
    return progress[card.id] || {
        known: false,
        interval: 0,
        reviewAt: 0,
        lastReviewed: 0
    };
}

function mergedCards() {
    return [
        ...defaultCards.map(c => ({ ...c, ...getProgress(c), source: "default" })),
        ...myWords.map(c => ({ ...c, ...getProgress(c), source: "mine" }))
    ];
}

function visibleCards() {
    return cards
        .map((card, index) => ({ card, index }))
        .filter(({ card }) =>
            (selectedCategory === "Semua" || card.category === selectedCategory) &&
            (
                (card.question || "").toLowerCase().includes(searchText.toLowerCase()) ||
                (card.answer || "").toLowerCase().includes(searchText.toLowerCase())
            )
        );
}

/* ==========================================
   LOGIN DAN PENDAFTARAN
   Firebase Authentication memakai email/password.
   ========================================== */

function setAuthMode(mode) {
    authMode = mode;

    const title = $("auth-title");
    const submit = $("auth-submit");
    const loginTab = $("show-login");
    const registerTab = $("show-register");

    if (title) title.textContent = mode === "login" ? "Selamat datang kembali" : "Buat akun Wordly";
    if (submit) submit.textContent = mode === "login" ? "Masuk" : "Daftar akun";

    loginTab?.classList.toggle("active", mode === "login");
    registerTab?.classList.toggle("active", mode === "register");

    showMessage("auth-message", "");
}

$("show-login")?.addEventListener("click", () => setAuthMode("login"));
$("show-register")?.addEventListener("click", () => setAuthMode("register"));

$("auth-form")?.addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("auth-username")?.value.trim();
    const password = $("auth-password")?.value;

    if (!email || !password) {
        showMessage("auth-message", "Isi email dan password terlebih dahulu.");
        return;
    }

    if (authMode === "register" && password.length < 6) {
        showMessage("auth-message", "Password minimal 6 karakter.");
        return;
    }

    const submit = $("auth-submit");
    if (submit) submit.disabled = true;

    try {
        if (authMode === "register") {
            const credential = await auth.createUserWithEmailAndPassword(email, password);

            await db.collection("users").doc(credential.user.uid).set({
                email: credential.user.email,
                displayName: email.split("@")[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (error) {
        const messages = {
            "auth/email-already-in-use": "Email sudah terdaftar. Silakan masuk.",
            "auth/invalid-email": "Format email tidak valid.",
            "auth/weak-password": "Password terlalu lemah.",
            "auth/user-not-found": "Akun tidak ditemukan.",
            "auth/wrong-password": "Email atau password salah.",
            "auth/invalid-credential": "Email atau password salah.",
            "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
            "permission-denied": "Akses Firestore ditolak. Periksa Security Rules."
        };

        showMessage(
            "auth-message",
            messages[error.code] || "Gagal masuk/daftar: " + error.message
        );
    } finally {
        if (submit) submit.disabled = false;
    }
});

/* ==========================================
   PEMUATAN DATA DARI FIRESTORE
   ========================================== */

async function publishLegacyMyWords(wordDocs) {
    const unpublished = wordDocs.filter(doc => {
        const word = doc.data();
        return word.createdBy === currentUser.uid && !word.publicWordId && !word.referenceId;
    });
    const publishedIds = {};

    for (let start = 0; start < unpublished.length; start += 250) {
        const batch = db.batch();
        const group = unpublished.slice(start, start + 250);

        group.forEach(doc => {
            const publicRef = db.collection("publicWords").doc();
            batch.set(publicRef, doc.data());
            batch.update(doc.ref, { publicWordId: publicRef.id });
            publishedIds[doc.id] = publicRef.id;
        });

        await batch.commit();
    }

    return publishedIds;
}

async function loadUserData() {
    if (!currentUser) return;

    loadingData = true;

    try {
        const [wordsSnapshot, refsSnapshot, progressSnapshot] = await Promise.all([
            userCollection("myWords").get(),
            userCollection("references").get(),
            userCollection("progress").get()
        ]);

        const publishedIds = await publishLegacyMyWords(wordsSnapshot.docs);
        myWords = wordsSnapshot.docs.map(doc => ({
            ...doc.data(),
            ...(publishedIds[doc.id] ? { publicWordId: publishedIds[doc.id] } : {}),
            id: doc.id,
            source: "mine"
        }));

        referenceWords = refsSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            source: "reference"
        }));

        progress = {};
        progressSnapshot.docs.forEach(doc => {
            progress[doc.id] = doc.data();
        });

        cards = mergedCards();

        currentIndex = 0;
        isFlipped = false;

        renderStats();
        renderCard();
        renderMyWords();
        renderReferenceWords();
        renderProfile();
    } catch (error) {
        console.error("Gagal memuat data:", error);
        alert("Data gagal dimuat. Periksa koneksi internet dan Security Rules Firestore.");
    } finally {
        loadingData = false;
    }
}

auth.onAuthStateChanged(async user => {
    currentUser = user;

    const authPage = $("auth-page");
    const appPage = $("app-page");

    if (!user) {
        authPage?.classList.remove("hidden");
        appPage?.classList.add("hidden");
        myWords = [];
        referenceWords = [];
        progress = {};
        cards = [];
        if (unsubscribeReferenceWords) {
            unsubscribeReferenceWords();
            unsubscribeReferenceWords = null;
        }
        return;
    }

    authPage?.classList.add("hidden");
    appPage?.classList.remove("hidden");

    if ($("header-username")) {
        $("header-username").textContent = user.email || "Pengguna Wordly";
    }

    if ($("profile-avatar")) {
        $("profile-avatar").textContent =
            (user.email || "W").charAt(0).toUpperCase();
    }

    await loadUserData();
});

/* ==========================================
   STATISTIK DAN FLASHCARD
   ========================================== */

function renderStats() {
    cards = mergedCards();

    const total = cards.length;
    const known = cards.filter(c => c.known).length;
    const percent = total ? Math.round(known / total * 100) : 0;

    if ($("total-count")) $("total-count").textContent = total;
    if ($("known-count")) $("known-count").textContent = known;
    if ($("progress-percent")) $("progress-percent").textContent = percent + "%";
    if ($("progress-fill")) $("progress-fill").style.width = percent + "%";

    if ($("progress-caption")) {
        $("progress-caption").textContent = percent === 100
            ? "Hebat! Semua kata sudah diingat."
            : percent >= 50
                ? "Bagus, terus pertahankan!"
                : "Mulai dari satu kata dulu.";
    }

    if ($("list-count")) $("list-count").textContent = total + " kata";
    renderProfile();
}

function renderCard() {
    cards = mergedCards();

    const shown = visibleCards();
    const flashcard = $("flashcard");

    if (!flashcard) return;

    if (!shown.length) {
        if ($("card-question")) $("card-question").textContent = "Tidak ada kata";
        if ($("card-answer")) $("card-answer").textContent = "Coba kategori atau pencarian lain.";

        ["card-pronunciation", "card-example", "card-translation"].forEach(id => {
            if ($(id)) $(id).textContent = "";
        });

        if ($("card-counter")) $("card-counter").textContent = "00 / 00";
        if ($("category-pill")) $("category-pill").textContent = "KOSONG";
        if ($("card-emoji")) $("card-emoji").textContent = "";

        flashcard.classList.remove("is-flipped");
        renderList();
        return;
    }

    currentIndex = Math.min(currentIndex, shown.length - 1);
    const card = shown[currentIndex].card;

    if ($("card-question")) $("card-question").textContent = card.question;
    if ($("card-answer")) $("card-answer").textContent = card.answer;
    if ($("card-pronunciation")) $("card-pronunciation").textContent = card.pronunciation || "";
    if ($("card-example")) $("card-example").textContent = card.example || "";
    if ($("card-translation")) $("card-translation").textContent = card.translation || "";
    if ($("card-emoji")) $("card-emoji").textContent = card.emoji || "📘";

    if ($("card-counter")) {
        $("card-counter").textContent =
            String(currentIndex + 1).padStart(2, "0") + " / " +
            String(shown.length).padStart(2, "0");
    }

    if ($("category-pill")) {
        $("category-pill").textContent = (card.category || "Benda").toUpperCase();
    }

    flashcard.classList.toggle("is-flipped", isFlipped);

    if ($("prev-card")) $("prev-card").disabled = shown.length < 2;
    if ($("next-card")) $("next-card").disabled = shown.length < 2;

    renderList();
}

function renderList() {
    const list = $("card-list");
    if (!list) return;

    list.innerHTML = "";

    const shown = visibleCards();

    if (!shown.length) {
        list.innerHTML = '<p class="empty-list">Kata tidak ditemukan. Coba pencarian lain.</p>';
        return;
    }

    shown.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "list-item" + (index === currentIndex ? " active" : "");

        const emoji = document.createElement("span");
        emoji.className = "list-emoji";
        emoji.textContent = item.card.emoji || "📘";

        const word = document.createElement("span");
        word.className = "list-word";

        const english = document.createElement("strong");
        english.textContent = item.card.question;

        const meaning = document.createElement("small");
        meaning.textContent = item.card.answer;

        const dot = document.createElement("span");
        dot.className = "list-status" + (item.card.known ? " known" : "");
        dot.title = item.card.known ? "Sudah diingat" : "Perlu diulang";

        word.append(english, meaning);
        button.append(emoji, word, dot);

        button.addEventListener("click", () => {
            currentIndex = index;
            isFlipped = false;
            renderCard();
        });

        list.appendChild(button);
    });
}

function moveCard(direction) {
    const shown = visibleCards();
    if (!shown.length) return;

    currentIndex = (currentIndex + direction + shown.length) % shown.length;
    isFlipped = false;
    renderCard();
}

$("flashcard")?.addEventListener("click", () => {
    if (!visibleCards().length) return;
    isFlipped = !isFlipped;
    renderCard();
});

$("prev-card")?.addEventListener("click", () => moveCard(-1));
$("next-card")?.addEventListener("click", () => moveCard(1));

$("shuffle-card")?.addEventListener("click", () => {
    const shown = visibleCards();
    if (shown.length < 2) return;

    const oldCard = shown[currentIndex].card;
    const shuffled = [...shown];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedId = shuffled.findIndex(x => x.card.id === oldCard.id);
    currentIndex = selectedId >= 0 ? selectedId : 0;

    // Pengacakan hanya untuk urutan tampilan, bukan data tersimpan.
    window._wordlyShuffle = shuffled.map(x => x.card.id);
    isFlipped = false;
    renderCard();
});

$("mark-known")?.addEventListener("click", () => markCard(true));
$("mark-review")?.addEventListener("click", () => markCard(false));

async function markCard(known) {
    const shown = visibleCards();
    if (!shown.length || !currentUser) return;

    const card = shown[currentIndex].card;
    const previous = getProgress(card);
    const now = Date.now();

    const interval = known
        ? (previous.interval ? Math.min(previous.interval * 2, 10080) : 10)
        : 1;

    const updated = {
        known,
        interval,
        reviewAt: now + interval * 60000,
        lastReviewed: now
    };

    progress[card.id] = updated;

    try {
        await userCollection("progress").doc(card.id).set(updated, { merge: true });
        renderStats();

        if (shown.length > 1) {
            currentIndex = (currentIndex + 1) % shown.length;
        }

        isFlipped = false;
        renderCard();
    } catch (error) {
        console.error(error);
        alert("Progres belum tersimpan. Periksa aturan keamanan Firestore.");
    }
}

/* ==========================================
   PENCARIAN DAN FILTER KATEGORI
   ========================================== */

$("search-input")?.addEventListener("input", event => {
    searchText = event.target.value.trim();
    currentIndex = 0;
    isFlipped = false;
    renderCard();
});

$("category-filter")?.addEventListener("change", event => {
    selectedCategory = event.target.value;
    currentIndex = 0;
    isFlipped = false;
    renderCard();
});

/* ==========================================
   TAMBAH KOSAKATA PRIBADI
   ========================================== */

const dialog = $("add-card-dialog");

function openAddWordDialog() {
    showMessage("add-card-message", "");
    if (dialog?.showModal) dialog.showModal();
}

$("add-card-open")?.addEventListener("click", openAddWordDialog);
$("mywords-add-open")?.addEventListener("click", openAddWordDialog);
$("reference-add-open")?.addEventListener("click", openAddWordDialog);

$("close-dialog")?.addEventListener("click", () => dialog?.close());
$("cancel-add")?.addEventListener("click", () => dialog?.close());

$("add-card-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentUser) return;

    const submitButton = $("add-card-form")?.querySelector('button[type="submit"]');
    if (submitButton?.disabled) return;

    const question = $("new-question")?.value.trim();
    const answer = $("new-answer")?.value.trim();
    const category = $("new-category")?.value;
    const example = $("new-example")?.value.trim() || "";
    const emoji = $("new-emoji")?.value.trim() || "📘";

    if (!question || !answer) {
        showMessage("add-card-message", "Kata bahasa Inggris dan artinya wajib diisi.");
        return;
    }

    const duplicate = [...defaultCards, ...myWords].some(c =>
        c.question.toLowerCase() === question.toLowerCase()
    );

    if (duplicate) {
        showMessage("add-card-message", "Kata tersebut sudah ada di daftar.");
        return;
    }

    const newWord = {
        question,
        answer,
        category,
        example,
        translation: "",
        pronunciation: "",
        emoji,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (submitButton) submitButton.disabled = true;

    try {
        const personalRef = userCollection("myWords").doc();
        const publicRef = db.collection("publicWords").doc();
        const personalWord = { ...newWord, publicWordId: publicRef.id };
        const batch = db.batch();
        batch.set(personalRef, personalWord);
        batch.set(publicRef, newWord);
        await batch.commit();

        myWords.push({
            ...personalWord,
            id: personalRef.id,
            source: "mine",
            known: false
        });

        cards = mergedCards();
        selectedCategory = "Semua";
        searchText = "";
        currentIndex = cards.findIndex(c => c.id === personalRef.id);
        if (currentIndex < 0) currentIndex = 0;

        if ($("category-filter")) $("category-filter").value = "Semua";
        if ($("search-input")) $("search-input").value = "";

        if (activePage === "reference-page") {
            referenceWords.push({ ...newWord, id: publicRef.id, source: "reference" });
            renderReferenceWords();
        }

        event.target.reset();
        dialog?.close();

        renderStats();
        renderCard();
        renderMyWords();
    } catch (error) {
        console.error(error);
        showMessage("add-card-message", "Gagal menyimpan kata: " + error.message);
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});

/* ==========================================
   DAFTAR KOSAKATA PRIBADI
   ========================================== */

function renderMyWords() {
    const list = $("mywords-list");
    if (!list) return;

    list.innerHTML = "";

    if ($("myword-count")) {
        $("myword-count").textContent = myWords.length + " kata";
    }

    if (!myWords.length) {
        list.innerHTML = '<p class="empty-list">Kamu belum menambahkan kosakata sendiri.</p>';
        return;
    }

    const query = $("myword-search")?.value.trim().toLowerCase() || "";
    const filteredWords = myWords.filter(word =>
        word.question.toLowerCase().includes(query) ||
        word.answer.toLowerCase().includes(query)
    );

    if (!filteredWords.length) {
        list.innerHTML = '<p class="empty-list">Kata tidak ditemukan. Coba pencarian lain.</p>';
        return;
    }

    filteredWords.forEach(word => {
        const item = createWordItem(word, "mine");
        list.appendChild(item);
    });
}

function createWordItem(word, itemType = "") {
    const wrapper = document.createElement("article");
    wrapper.className = "list-item" + (itemType ? " " + itemType + "-word-item" : "");

    const emoji = document.createElement("span");
    emoji.className = "list-emoji";
    emoji.textContent = word.emoji || "📘";

    const details = document.createElement("span");
    details.className = "list-word";

    const title = document.createElement("strong");
    title.textContent = word.question;

    const meaning = document.createElement("small");
    meaning.textContent = word.answer;

    const category = document.createElement("span");
    category.className = "list-category";
    category.textContent = word.category || "Benda";

    details.append(title, meaning, category);
    wrapper.append(emoji, details);

    if (itemType === "reference") {
        wrapper.classList.add("reference-card");
        wrapper.setAttribute("role", "button");
        wrapper.tabIndex = 0;
        wrapper.setAttribute("aria-label", `Tambahkan ${word.question} ke daftar belajar`);

        const addHint = document.createElement("span");
        addHint.className = "reference-action";
        addHint.textContent = "＋ Tambahkan ke daftar belajar";
        wrapper.appendChild(addHint);

        wrapper.addEventListener("click", () => addReferenceToMyWords(word));
        wrapper.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                addReferenceToMyWords(word);
            }
        });
    } else if (itemType === "mine") {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "word-delete-button";
        deleteButton.textContent = "Hapus kata";
        deleteButton.setAttribute("aria-label", `Hapus kata ${word.question}`);
        deleteButton.addEventListener("click", () => deleteMyWord(word, deleteButton));
        wrapper.appendChild(deleteButton);
    }

    return wrapper;
}

async function deleteMyWord(word, deleteButton) {
    if (
        !currentUser ||
        deletingWordIds.has(word.id) ||
        !confirm(`Hapus kata "${word.question}" dari daftar kamu?`)
    ) return;

    deletingWordIds.add(word.id);
    deleteButton.disabled = true;
    deleteButton.textContent = "Menghapus...";

    try {
        const batch = db.batch();
        batch.delete(userCollection("myWords").doc(word.id));
        batch.delete(userCollection("progress").doc(word.id));

        if (word.createdBy === currentUser.uid && word.publicWordId) {
            batch.delete(db.collection("publicWords").doc(word.publicWordId));
        }

        await batch.commit();

        myWords = myWords.filter(item => item.id !== word.id);
        delete progress[word.id];
        if (word.publicWordId) {
            referenceWords = referenceWords.filter(item => item.id !== word.publicWordId);
        }

        currentIndex = 0;
        cards = mergedCards();
        renderStats();
        renderCard();
        renderMyWords();
        renderReferenceWords();
    } catch (error) {
        console.error(error);
        alert("Gagal menghapus kata: " + error.message);
    } finally {
        deletingWordIds.delete(word.id);
        deleteButton.disabled = false;
        deleteButton.textContent = "Hapus kata";
    }
}

$("myword-search")?.addEventListener("input", renderMyWords);

/* ==========================================
   KOSAKATA REFERENSI BERSAMA
   Sumber: koleksi publicWords di Firestore.
   ========================================== */

function loadReferenceWords() {
    const list = $("reference-list");
    if (list) list.innerHTML = '<p class="empty-list">Memuat kosakata referensi...</p>';

    if (unsubscribeReferenceWords) unsubscribeReferenceWords();

    unsubscribeReferenceWords = db.collection("publicWords").onSnapshot(snapshot => {
        referenceWords = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            source: "reference"
        }));

        renderReferenceWords();
    }, error => {
        console.error(error);
        if (list) {
            list.innerHTML = '<p class="empty-list">Referensi belum dapat dimuat. Periksa Security Rules Firestore.</p>';
        }
    });
}

function renderReferenceWords() {
    const list = $("reference-list");
    if (!list) return;

    list.innerHTML = "";

    if ($("reference-count")) {
        $("reference-count").textContent = referenceWords.length + " kata";
    }

    if (!referenceWords.length) {
        list.innerHTML = '<p class="empty-list">Belum ada kata referensi yang dibagikan.</p>';
        return;
    }

    const query = $("reference-search")?.value.trim().toLowerCase() || "";
    const filteredWords = referenceWords.filter(word =>
        word.question.toLowerCase().includes(query) ||
        word.answer.toLowerCase().includes(query)
    );

    if (!filteredWords.length) {
        list.innerHTML = '<p class="empty-list">Kata referensi tidak ditemukan.</p>';
        return;
    }

    filteredWords.forEach(word => {
        const alreadyAdded = myWords.some(c =>
            c.referenceId === word.id || c.publicWordId === word.id
        );

        const item = createWordItem(word, alreadyAdded ? "" : "reference");
        if (alreadyAdded) {
            const label = document.createElement("small");
            label.className = "word-author";
            label.textContent = "Sudah ada di daftar kamu";
            item.appendChild(label);
        }

        list.appendChild(item);
    });
}

async function addReferenceToMyWords(word) {
    if (!currentUser) return;

    if (
        addingReferenceIds.has(word.id) ||
        myWords.some(c => c.referenceId === word.id || c.publicWordId === word.id)
    ) {
        return;
    }

    addingReferenceIds.add(word.id);

    const newWord = {
        question: word.question,
        answer: word.answer,
        category: word.category || "Benda",
        pronunciation: word.pronunciation || "",
        example: word.example || "",
        translation: word.translation || "",
        emoji: word.emoji || "📘",
        referenceId: word.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const ref = await userCollection("myWords").add(newWord);

        myWords.push({
            ...newWord,
            id: ref.id,
            source: "mine",
            known: false
        });

        cards = mergedCards();
        renderStats();
        renderCard();
        renderMyWords();
        renderReferenceWords();
    } catch (error) {
        console.error(error);
        alert("Gagal menambahkan referensi: " + error.message);
    } finally {
        addingReferenceIds.delete(word.id);
    }
}

$("reference-search")?.addEventListener("input", renderReferenceWords);

/* ==========================================
   NAVIGASI MENU
   ========================================== */

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", async () => {
        const target = button.dataset.page;
        if (!target) return;

        activePage = target;

        document.querySelectorAll("[data-page]").forEach(btn => {
            btn.classList.toggle("active", btn === button);
        });

        document.querySelectorAll(".content-page").forEach(page => {
            page.classList.toggle("hidden", page.id !== target);
        });

        if (target === "reference-page") {
            await loadReferenceWords();
        }

        if (target === "profile-page") {
            renderProfile();
        }
    });
});

/* ==========================================
   PROFIL DAN LOGOUT
   ========================================== */

function renderProfile() {
    if (!currentUser) return;

    const known = cards.filter(c => c.known).length;
    const percent = cards.length ? Math.round(known / cards.length * 100) : 0;

    if ($("profile-email")) $("profile-email").textContent = currentUser.email || "";
    if ($("profile-total")) $("profile-total").textContent = cards.length;
    if ($("profile-known")) $("profile-known").textContent = known;
    if ($("profile-percent")) $("profile-percent").textContent = percent + "%";
    if ($("profile-custom-count")) $("profile-custom-count").textContent = myWords.length;
}

async function logout() {
    try {
        await auth.signOut();
    } catch (error) {
        alert("Gagal keluar: " + error.message);
    }
}

$("logout-button")?.addEventListener("click", logout);
$("profile-logout-button")?.addEventListener("click", logout);

/* ==========================================
   DARK MODE
   ========================================== */

function setDarkMode(enabled) {
    document.body.classList.toggle("dark-mode", enabled);

    const text = enabled ? "☀️ Mode terang" : "🌙 Mode gelap";

    if ($("theme-button")) $("theme-button").textContent = enabled ? "☀️" : "🌙";
    if ($("profile-theme-button")) $("profile-theme-button").textContent = text;

    localStorage.setItem("wordlyDarkMode", enabled ? "on" : "off");
}

function toggleDarkMode() {
    setDarkMode(!document.body.classList.contains("dark-mode"));
}

$("theme-button")?.addEventListener("click", toggleDarkMode);
$("profile-theme-button")?.addEventListener("click", toggleDarkMode);

setDarkMode(localStorage.getItem("wordlyDarkMode") === "on");
