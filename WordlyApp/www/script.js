
// Data kosakata bahasa Inggris dasar
const defaultCards = [
    ["Book", "Buku", "Benda", "/bʊk/", "This is my book.", "Ini buku saya."],
    ["Chair", "Kursi", "Benda", "/tʃer/", "Sit on the chair.", "Duduklah di kursi."],
    ["Table", "Meja", "Benda", "/ˈteɪ.bəl/", "The cup is on the table.", "Cangkir ada di atas meja."],
    ["Door", "Pintu", "Benda", "/dɔːr/", "Please close the door.", "Tolong tutup pintunya."],
    ["Window", "Jendela", "Benda", "/ˈwɪn.doʊ/", "Open the window, please.", "Tolong buka jendelanya."],
    ["House", "Rumah", "Benda", "/haʊs/", "My house is small.", "Rumah saya kecil."],
    ["Water", "Air", "Benda", "/ˈwɔː.tər/", "I drink water every day.", "Saya minum air setiap hari."],
    ["Food", "Makanan", "Benda", "/fuːd/", "The food is delicious.", "Makanannya lezat."],
    ["Friend", "Teman", "Benda", "/frend/", "She is my friend.", "Dia teman saya."],
    ["School", "Sekolah", "Benda", "/skuːl/", "I go to school.", "Saya pergi ke sekolah."],
    ["Eat", "Makan", "Kerja", "/iːt/", "I eat rice.", "Saya makan nasi."],
    ["Drink", "Minum", "Kerja", "/drɪŋk/", "I drink milk.", "Saya minum susu."],
    ["Read", "Membaca", "Kerja", "/riːd/", "I read a book.", "Saya membaca buku."],
    ["Write", "Menulis", "Kerja", "/raɪt/", "Please write your name.", "Tolong tulis namamu."],
    ["Sleep", "Tidur", "Kerja", "/sliːp/", "I sleep at ten.", "Saya tidur pukul sepuluh."],
    ["Walk", "Berjalan", "Kerja", "/wɔːk/", "We walk to the park.", "Kami berjalan ke taman."],
    ["Happy", "Senang / bahagia", "Sifat", "/ˈhæp.i/", "I am happy today.", "Saya senang hari ini."],
    ["Sad", "Sedih", "Sifat", "/sæd/", "He looks sad.", "Dia terlihat sedih."],
    ["Big", "Besar", "Sifat", "/bɪɡ/", "That is a big house.", "Itu rumah yang besar."],
    ["Small", "Kecil", "Sifat", "/smɔːl/", "I have a small bag.", "Saya punya tas kecil."],
    ["Beautiful", "Cantik / indah", "Sifat", "/ˈbjuː.tɪ.fəl/", "The flower is beautiful.", "Bunga itu indah."],
    ["Thank you", "Terima kasih", "Sehari-hari", "/θæŋk juː/", "Thank you for your help.", "Terima kasih atas bantuanmu."],
    ["Good morning", "Selamat pagi", "Sehari-hari", "/ɡʊd ˈmɔːr.nɪŋ/", "Good morning, everyone!", "Selamat pagi, semuanya."],
    ["How are you?", "Apa kabar?", "Sehari-hari", "/haʊ ɑːr juː/", "Hi, how are you?", "Hai, apa kabar?"]
];

// Nama tempat penyimpanan data di browser
const KEY = "wordlyAsharEnglishCards";

// Variabel untuk mengatur kartu yang sedang dibuka
let cards = loadCards();
let currentIndex = 0;
let isFlipped = false;
let searchText = "";
let selectedCategory = "Semua";

// Mengambil data kartu dari penyimpanan browser
function loadCards() {
    try {
        const saved = localStorage.getItem(KEY);

        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.log("Data lokal belum bisa dibaca");
    }

    // Menggunakan data awal jika belum ada data tersimpan
    return defaultCards.map((v, i) => ({
        id: Date.now() + i,
        question: v[0],
        answer: v[1],
        category: v[2],
        pronunciation: v[3],
        example: v[4],
        translation: v[5],
        known: false,
        interval: 0,
        reviewAt: 0,
        lastReviewed: 0
    }));
}

// Menyimpan data kartu ke browser
function saveCards() {
    localStorage.setItem(KEY, JSON.stringify(cards));
}

// Menampilkan kartu sesuai kategori dan pencarian
function visibleCards() {
    return cards
        .map((card, index) => ({ card, index }))
        .filter(x =>
            (selectedCategory === "Semua" ||
                x.card.category === selectedCategory) &&
            (
                x.card.question.toLowerCase().includes(searchText.toLowerCase()) ||
                x.card.answer.toLowerCase().includes(searchText.toLowerCase())
            )
        );
}

// Memperbarui jumlah kata dan progres hafalan
function renderStats() {
    let total = cards.length;
    let known = cards.filter(c => c.known).length;
    let pct = total ? Math.round(known / total * 100) : 0;

    document.getElementById("total-count").textContent = total;
    document.getElementById("known-count").textContent = known;
    document.getElementById("progress-percent").textContent = pct + "%";
    document.getElementById("progress-fill").style.width = pct + "%";

    document.getElementById("progress-caption").textContent =
        pct === 100
            ? "Hebat! Semua kata sudah diingat."
            : pct >= 50
                ? "Bagus, terus pertahankan!"
                : "Mulai dari satu kata dulu";

    document.getElementById("list-count").textContent = total + " kata";
}

// Menampilkan kata dan arti pada flashcard
function renderCard() {
    let shown = visibleCards();
    let el = document.getElementById("flashcard");

    // Pesan jika kata tidak ditemukan
    if (!shown.length) {
        document.getElementById("card-question").textContent = "Tidak ada kata";
        document.getElementById("card-answer").textContent =
            "Coba kategori atau pencarian lain.";

        ["card-pronunciation", "card-example", "card-translation"]
            .forEach(id => {
                document.getElementById(id).textContent = "";
            });

        document.getElementById("card-counter").textContent = "00 / 00";
        document.getElementById("category-pill").textContent = "KOSONG";

        el.classList.remove("is-flipped");
        renderList();
        return;
    }

    // Memulai lagi dari kartu pertama jika sudah melewati daftar
    if (currentIndex >= shown.length) {
        currentIndex = 0;
    }

    let c = shown[currentIndex].card;

    document.getElementById("card-question").textContent = c.question;
    document.getElementById("card-answer").textContent = c.answer;

    document.getElementById("card-pronunciation").textContent =
        c.pronunciation || "";

    document.getElementById("card-example").textContent = c.example || "";
    document.getElementById("card-translation").textContent = c.translation || "";

    // Menampilkan nomor kartu dan kategorinya
    document.getElementById("card-counter").textContent =
        String(currentIndex + 1).padStart(2, "0") +
        " / " +
        String(shown.length).padStart(2, "0");

    document.getElementById("category-pill").textContent =
        (c.category || "Benda").toUpperCase();

    // Mengatur posisi depan atau belakang kartu
    el.classList.toggle("is-flipped", isFlipped);

    document.getElementById("prev-card").disabled = shown.length < 2;
    document.getElementById("next-card").disabled = shown.length < 2;

    renderList();
}

// Menampilkan daftar kata di bawah flashcard
function renderList() {
    let list = document.getElementById("card-list");
    list.innerHTML = "";

    let shown = visibleCards();

    // Menampilkan pesan jika pencarian kosong
    if (!shown.length) {
        list.innerHTML =
            '<p class="empty-list">Kata tidak ditemukan. Coba kata lain.</p>';
        return;
    }

    shown.forEach((item, i) => {
        let b = document.createElement("button");

        b.type = "button";
        b.className = "list-item" + (i === currentIndex ? " active" : "");

        let w = document.createElement("span");
        w.className = "list-word";

        let en = document.createElement("strong");
        en.textContent = item.card.question;

        let id = document.createElement("small");
        id.textContent = item.card.answer;

        w.append(en, id);

        // Menampilkan tanda status hafalan
        let dot = document.createElement("span");
        dot.className = "list-status" + (item.card.known ? " known" : "");

        dot.title = item.card.known
            ? "Sudah ingat"
            : "Perlu diulang";

        b.append(w, dot);

        // Membuka kartu saat kata di daftar diklik
        b.addEventListener("click", () => {
            currentIndex = i;
            isFlipped = false;
            renderCard();
        });

        list.appendChild(b);
    });
}

// Berpindah ke kartu sebelumnya atau berikutnya
function moveCard(n) {
    let shown = visibleCards();

    if (!shown.length) {
        return;
    }

    currentIndex = (currentIndex + n + shown.length) % shown.length;
    isFlipped = false;

    renderCard();
}

// Menandai kartu sudah ingat atau perlu diulang
function markCard(known) {
    let shown = visibleCards();

    if (!shown.length) {
        return;
    }

    let c = shown[currentIndex].card;
    let now = Date.now();

    c.known = known;
    c.lastReviewed = now;

    // Mengatur jeda pengulangan berdasarkan hasil hafalan
    if (known) {
        c.interval = c.interval
            ? Math.min(c.interval * 2, 10080)
            : 10;

        c.reviewAt = now + c.interval * 60000;
    } else {
        c.interval = 1;
        c.reviewAt = now + 60000;
    }

    saveCards();
    renderStats();

    // Melanjutkan ke kartu berikutnya
    if (shown.length > 1) {
        currentIndex = (currentIndex + 1) % shown.length;
    }

    isFlipped = false;
    renderCard();
}

// Mengacak urutan kartu
function shuffleCards() {
    let shown = visibleCards();

    if (shown.length < 2) {
        return;
    }

    let shuffled = shown.map(x => x.card);

    // Mengacak posisi kartu
    for (let i = shuffled.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Memasukkan kartu yang sudah diacak ke daftar
    let shownIds = new Set(shuffled.map(c => c.id));

    cards = cards
        .filter(c => !shownIds.has(c.id))
        .concat(shuffled);

    currentIndex = 0;
    isFlipped = false;

    saveCards();
    renderCard();
}

// Menambahkan kosakata baru ke daftar
function addCard(question, answer, category, example) {
    cards.push({
        id: Date.now(),
        question,
        answer,
        category,
        pronunciation: "",
        example,
        translation: "",
        known: false,
        interval: 0,
        reviewAt: 0,
        lastReviewed: 0
    });

    // Mengembalikan filter ke semua kategori
    selectedCategory = "Semua";
    document.getElementById("category-filter").value = "Semua";

    searchText = "";
    document.getElementById("search-input").value = "";

    currentIndex = visibleCards().length - 1;
    isFlipped = false;

    saveCards();
    renderStats();
    renderCard();
}

// Membalik flashcard saat kartu diklik
document.getElementById("flashcard").addEventListener("click", () => {
    if (!visibleCards().length) {
        return;
    }

    isFlipped = !isFlipped;
    renderCard();
});

// Menghubungkan tombol navigasi
document.getElementById("prev-card").addEventListener("click", () => moveCard(-1));
document.getElementById("next-card").addEventListener("click", () => moveCard(1));
document.getElementById("shuffle-card").addEventListener("click", shuffleCards);

// Menghubungkan tombol status hafalan
document.getElementById("mark-known").addEventListener("click", () => {
    markCard(true);
});

document.getElementById("mark-review").addEventListener("click", () => {
    markCard(false);
});

// Menjalankan pencarian kosakata
document.getElementById("search-input").addEventListener("input", e => {
    searchText = e.target.value.trim();
    currentIndex = 0;
    isFlipped = false;

    renderCard();
});

// Mengganti kategori kartu
document.getElementById("category-filter").addEventListener("change", e => {
    selectedCategory = e.target.value;
    currentIndex = 0;
    isFlipped = false;

    renderCard();
});

// Membuka form tambah kosakata
const dialog = document.getElementById("add-card-dialog");

document.getElementById("add-card-open").addEventListener("click", () => {
    dialog.showModal();
});

// Menutup form tambah kosakata
document.getElementById("close-dialog").addEventListener("click", () => {
    dialog.close();
});

document.getElementById("cancel-add").addEventListener("click", () => {
    dialog.close();
});

// Menyimpan kosakata dari form
document.getElementById("add-card-form").addEventListener("submit", e => {
    e.preventDefault();

    let q = document.getElementById("new-question").value.trim();
    let a = document.getElementById("new-answer").value.trim();
    let cat = document.getElementById("new-category").value;
    let ex = document.getElementById("new-example").value.trim();

    if (!q || !a) {
        return;
    }

    addCard(q, a, cat, ex);

    e.target.reset();
    dialog.close();
});

// Menampilkan data saat halaman dibuka
renderStats();
renderCard();
