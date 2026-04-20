/**
 * ui.js
 * DOM manipülasyonu ve render işlemlerini yöneten modül.
 *
 * Dışa açılan fonksiyonlar:
 *   renderMovieCards, renderMovieDetail, closeModal,
 *   renderLoading, renderError, renderEmpty, renderPagination,
 *   showToast, renderFavoritesPanel, openFavoritesPanel, closeFavoritesPanel,
 *   updateFavoritesCount, renderSearchHistory,
 *   showSearchHistoryDropdown, hideSearchHistoryDropdown,
 *   renderModalLoading
 */

// --------------------------------------------------------------------------
// Sabitler
// --------------------------------------------------------------------------

/**
 * Poster URL'i yoksa veya bozuksa kullanılacak yerel SVG placeholder.
 * via.placeholder.com gibi dış bağımlılık yoktur.
 */
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "width='300' height='445'%3E" +
  "%3Crect width='300' height='445' fill='%231a1a2e'/%3E" +
  "%3Crect x='100' y='155' width='100' height='130' rx='8' fill='%232a2a4a'/%3E" +
  "%3Crect x='116' y='172' width='68' height='7' rx='3' fill='%23333355'/%3E" +
  "%3Crect x='116' y='187' width='52' height='7' rx='3' fill='%23333355'/%3E" +
  "%3Crect x='116' y='202' width='60' height='7' rx='3' fill='%23333355'/%3E" +
  "%3Crect x='116' y='217' width='45' height='7' rx='3' fill='%23333355'/%3E" +
  "%3Ctext x='150' y='320' font-family='Arial%2Csans-serif' font-size='13' " +
  "text-anchor='middle' fill='%23444466'%3ENo Poster%3C%2Ftext%3E" +
  "%3C%2Fsvg%3E";

/** Bozuk poster resimlerini yakalamak için global onerror handler */
window._onPosterError = function (img) {
  img.onerror = null;
  img.src = PLACEHOLDER_IMG;
};

/**
 * Poster URL'ini döner. "N/A" veya boş ise placeholder döner.
 * @param {string | undefined} poster
 * @returns {string}
 */
function getPosterSrc(poster) {
  return poster && poster !== "N/A" ? poster : PLACEHOLDER_IMG;
}

// --------------------------------------------------------------------------
// DOM Referansları (sayfa yüklendikten sonra kullanılır)
// --------------------------------------------------------------------------

function _el(id) {
  return document.getElementById(id);
}

// --------------------------------------------------------------------------
// Film Kartları
// --------------------------------------------------------------------------

/**
 * Film kartlarını grid içinde render eder.
 * @param {Array}  movies        - OMDB Search[] dizisi
 * @param {number} totalResults  - Toplam sonuç sayısı
 * @param {number} currentPage   - Gösterilen sayfa numarası
 */
function renderMovieCards(movies, totalResults, currentPage) {
  const totalPages = Math.ceil(totalResults / 10);
  _el("results-info").textContent =
    `${totalResults.toLocaleString("tr-TR")} sonuç bulundu` +
    (totalPages > 1 ? ` — Sayfa ${currentPage} / ${totalPages}` : "");

  _el("results-grid").innerHTML = movies
    .map(
      (movie) => `
      <div
        class="movie-card"
        data-imdbid="${_esc(movie.imdbID)}"
        role="button"
        tabindex="0"
        aria-label="${_esc(movie.Title)} filmini görüntüle"
      >
        <div class="movie-card__poster-wrapper">
          <img
            class="movie-card__poster"
            src="${getPosterSrc(movie.Poster)}"
            alt="${_esc(movie.Title)} posteri"
            loading="lazy"
            onerror="window._onPosterError(this)"
          />
        </div>
        <div class="movie-card__info">
          <h3 class="movie-card__title">${_esc(movie.Title)}</h3>
          <div class="movie-card__meta">
            <span class="movie-card__year">${_esc(movie.Year)}</span>
            <span class="movie-card__type">${_typeLabel(movie.Type)}</span>
          </div>
        </div>
      </div>`,
    )
    .join("");
}

// --------------------------------------------------------------------------
// Film Detay Modalı
// --------------------------------------------------------------------------

/**
 * Film detay modalını render eder ve açar.
 * @param {Object} movie - OMDB detail API yanıtı
 */
function renderMovieDetail(movie) {
  const isFav = getFavorites().some((f) => f.imdbID === movie.imdbID);

  _el("modal-content").innerHTML = `
    <button class="modal__close" id="modal-close-btn" aria-label="Modalı kapat" type="button">✕</button>
    <div class="modal__body">
      <div class="modal__poster-col">
        <img
          class="modal__poster"
          src="${getPosterSrc(movie.Poster)}"
          alt="${_esc(movie.Title)} posteri"
          onerror="window._onPosterError(this)"
        />
      </div>
      <div class="modal__info-col">
        <h2 class="modal__title">
          ${_esc(movie.Title)}
          <span class="modal__year">(${_esc(movie.Year)})</span>
        </h2>

        ${_field(
          "modal__rating",
          movie.imdbRating,
          (v) => `⭐ IMDb: <strong>${v}</strong>/10`,
        )}
        ${_field(
          "modal__runtime",
          movie.Runtime,
          (v) => `🕐 <strong>Süre:</strong> ${v}`,
        )}
        ${_field(
          "modal__genre",
          movie.Genre,
          (v) => `📁 <strong>Tür:</strong> ${v}`,
        )}
        ${_field(
          "modal__director",
          movie.Director,
          (v) => `🎬 <strong>Yönetmen:</strong> ${v}`,
        )}
        ${_field(
          "modal__actors",
          movie.Actors,
          (v) => `👥 <strong>Oyuncular:</strong> ${v}`,
        )}
        ${_field(
          "modal__country",
          movie.Country,
          (v) => `🌍 <strong>Ülke:</strong> ${v}`,
        )}
        ${_field(
          "modal__language",
          movie.Language,
          (v) => `🗣️ <strong>Dil:</strong> ${v}`,
        )}
        ${
          movie.Plot && movie.Plot !== "N/A"
            ? `<div class="modal__plot"><strong>📝 Konu:</strong>${_esc(movie.Plot)}</div>`
            : ""
        }

        <div class="modal__actions">
          <a
            class="btn btn--secondary"
            href="https://www.imdb.com/title/${_esc(movie.imdbID)}"
            target="_blank"
            rel="noopener noreferrer"
          >🔗 IMDb'de Gör</a>
          <button
            class="btn ${isFav ? "btn--danger" : "btn--primary"}"
            id="fav-toggle-btn"
            type="button"
            data-imdbid="${_esc(movie.imdbID)}"
          >${isFav ? "💔 Favorilerden Çıkar" : "❤️ Favorilere Ekle"}</button>
        </div>
      </div>
    </div>`;

  // Modalı aç
  const overlay = _el("modal-overlay");
  overlay.classList.add("modal--open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // İlk odaklanılabilir elemana odaklan
  _el("modal-close-btn").focus();

  // Kapat butonu
  _el("modal-close-btn").addEventListener("click", closeModal);

  // Favori toggle butonu
  _el("fav-toggle-btn").addEventListener("click", () => {
    const btn = _el("fav-toggle-btn");
    const added = toggleFavorite({
      imdbID: movie.imdbID,
      Title: movie.Title,
      Poster: movie.Poster,
      Year: movie.Year,
    });

    btn.textContent = added ? "💔 Favorilerden Çıkar" : "❤️ Favorilere Ekle";
    btn.className = `btn ${added ? "btn--danger" : "btn--primary"}`;

    showToast(
      added
        ? `❤️ "${movie.Title}" favorilere eklendi.`
        : `💔 "${movie.Title}" favorilerden çıkarıldı.`,
      added ? "success" : "info",
    );

    // Favori sayacını ve paneli güncelle
    const favorites = getFavorites();
    updateFavoritesCount(favorites.length);
    renderFavoritesPanel(favorites);
  });
}

/**
 * Modal yükleme (spinner) durumunu gösterir.
 */
function renderModalLoading() {
  const overlay = _el("modal-overlay");
  _el("modal-content").innerHTML = `
    <button class="modal__close" id="modal-close-btn" aria-label="Modalı kapat" type="button">✕</button>
    <div class="modal__loading">
      <div class="modal__spinner" role="status" aria-label="Yükleniyor"></div>
      <p>Film bilgileri yükleniyor...</p>
    </div>`;

  overlay.classList.add("modal--open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  _el("modal-close-btn").addEventListener("click", closeModal);
}

/** Modalı kapatır ve body overflow'u serbest bırakır. */
function closeModal() {
  const overlay = _el("modal-overlay");
  overlay.classList.remove("modal--open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// --------------------------------------------------------------------------
// Yükleniyor / Hata / Boş Durumlar
// --------------------------------------------------------------------------

/** Skeleton kart animasyonu ile yükleniyor durumunu gösterir. */
function renderLoading() {
  _el("results-info").textContent = "Aranıyor...";
  _el("pagination").innerHTML = "";

  _el("results-grid").innerHTML = Array(10)
    .fill("")
    .map(
      () => `
      <div class="movie-card movie-card--skeleton" aria-hidden="true">
        <div class="movie-card__poster-wrapper"></div>
        <div class="movie-card__info">
          <div class="skeleton-text skeleton-text--title"></div>
          <div class="skeleton-text skeleton-text--title-2"></div>
          <div class="skeleton-text skeleton-text--short"></div>
        </div>
      </div>`,
    )
    .join("");
}

/**
 * Hata mesajı gösterir.
 * @param {string} message - Kullanıcıya gösterilecek hata metni
 */
function renderError(message) {
  _el("results-info").textContent = "";
  _el("pagination").innerHTML = "";
  _el("results-grid").innerHTML = `
    <div class="state-message state-message--error" role="alert">
      <span class="state-message__icon">⚠️</span>
      <p class="state-message__text">${_esc(message)}</p>
    </div>`;
}

/** Başlangıç/boş durumu gösterir. */
function renderEmpty() {
  _el("results-info").textContent = "";
  _el("pagination").innerHTML = "";
  _el("results-grid").innerHTML = `
    <div class="state-message state-message--empty">
      <span class="state-message__icon">🎬</span>
      <p class="state-message__text">
        Film veya dizi adı yazın, <strong>Ara</strong>'ya tıklayın.
      </p>
    </div>`;
}

// --------------------------------------------------------------------------
// Sayfalama
// --------------------------------------------------------------------------

/**
 * Sayfalama (pagination) bileşenini render eder.
 * @param {number} currentPage
 * @param {number} totalResults
 */
function renderPagination(currentPage, totalResults) {
  const totalPages = Math.ceil(totalResults / 10);
  const container = _el("pagination");

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  // Gösterilecek sayfa numarası butonlarını hesapla (en fazla 5 numara)
  const pages = _getPageRange(currentPage, totalPages);

  container.innerHTML = `
    <button
      class="pagination__btn"
      id="page-prev"
      type="button"
      aria-label="Önceki sayfa"
      ${currentPage === 1 ? "disabled" : ""}
    >← Önceki</button>

    <div class="pagination__pages">
      ${pages
        .map((p) =>
          p === "..."
            ? `<span class="pagination__ellipsis">…</span>`
            : `<button
                class="pagination__btn pagination__btn--num ${p === currentPage ? "pagination__btn--active" : ""}"
                data-page="${p}"
                type="button"
                aria-label="Sayfa ${p}"
                aria-current="${p === currentPage ? "page" : "false"}"
              >${p}</button>`,
        )
        .join("")}
    </div>

    <button
      class="pagination__btn"
      id="page-next"
      type="button"
      aria-label="Sonraki sayfa"
      ${currentPage === totalPages ? "disabled" : ""}
    >Sonraki →</button>`;

  // Önceki / Sonraki butonları
  _el("page-prev")?.addEventListener("click", () =>
    AppState.goToPage(currentPage - 1),
  );
  _el("page-next")?.addEventListener("click", () =>
    AppState.goToPage(currentPage + 1),
  );

  // Numara butonları (event delegation)
  container.querySelectorAll(".pagination__btn--num").forEach((btn) => {
    btn.addEventListener("click", () =>
      AppState.goToPage(parseInt(btn.dataset.page, 10)),
    );
  });
}

// --------------------------------------------------------------------------
// Arama Geçmişi Dropdown
// --------------------------------------------------------------------------

/**
 * Arama geçmişini dropdown listesine render eder.
 * @param {string[]} history - Geçmiş sorgu listesi
 * @param {function(string): void} onSelect - Öğeye tıklanınca çağrılır
 */
function renderSearchHistory(history, onSelect) {
  const list = _el("search-history-list");
  if (!list) return;

  list.innerHTML = history
    .map(
      (item) =>
        `<li
          class="search-history__item"
          role="option"
          tabindex="0"
          data-query="${_esc(item)}"
          aria-label="${_esc(item)} aramasını yeniden yap"
        >${_esc(item)}</li>`,
    )
    .join("");

  list.querySelectorAll(".search-history__item").forEach((el) => {
    el.addEventListener("click", () => onSelect(el.dataset.query));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(el.dataset.query);
      }
    });
  });
}

/** Arama geçmişi dropdown'ını gösterir. */
function showSearchHistoryDropdown() {
  const dropdown = _el("search-history-dropdown");
  const input = _el("search-input");
  if (!dropdown) return;
  dropdown.hidden = false;
  input?.setAttribute("aria-expanded", "true");
}

/** Arama geçmişi dropdown'ını gizler. */
function hideSearchHistoryDropdown() {
  const dropdown = _el("search-history-dropdown");
  const input = _el("search-input");
  if (!dropdown) return;
  dropdown.hidden = true;
  input?.setAttribute("aria-expanded", "false");
}

// --------------------------------------------------------------------------
// Favoriler Paneli
// --------------------------------------------------------------------------

/**
 * Favoriler panelinin içeriğini render eder.
 * @param {Array<{imdbID: string, Title: string, Poster: string, Year: string}>} favorites
 */
function renderFavoritesPanel(favorites) {
  const list = _el("favorites-list");
  if (!list) return;

  if (favorites.length === 0) {
    list.innerHTML = `
      <div class="favorites-panel__empty">
        <span class="favorites-panel__empty-icon">💔</span>
        <p>Henüz favori eklemediniz.</p>
        <p>Film detayından ❤️ butonuna basın.</p>
      </div>`;
    return;
  }

  list.innerHTML = favorites
    .map(
      (fav) => `
      <div
        class="fav-item"
        role="listitem"
        data-imdbid="${_esc(fav.imdbID)}"
        tabindex="0"
        aria-label="${_esc(fav.Title)} filmini görüntüle"
      >
        <img
          class="fav-item__poster"
          src="${getPosterSrc(fav.Poster)}"
          alt="${_esc(fav.Title)} posteri"
          onerror="window._onPosterError(this)"
          loading="lazy"
        />
        <div class="fav-item__info">
          <span class="fav-item__title">${_esc(fav.Title)}</span>
          <span class="fav-item__year">${_esc(fav.Year)}</span>
        </div>
        <button
          class="fav-item__remove"
          type="button"
          data-imdbid="${_esc(fav.imdbID)}"
          aria-label="${_esc(fav.Title)} favorilerden kaldır"
          title="Favorilerden kaldır"
        >✕</button>
      </div>`,
    )
    .join("");

  // Kart tıklaması → detay aç
  list.querySelectorAll(".fav-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      // "Kaldır" butonuna tıklandıysa detay açma
      if (e.target.classList.contains("fav-item__remove")) return;
      const imdbID = item.dataset.imdbid;
      closeFavoritesPanel();
      await _openDetail(imdbID);
    });

    item.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        closeFavoritesPanel();
        await _openDetail(item.dataset.imdbid);
      }
    });
  });

  // Kaldır butonları
  list.querySelectorAll(".fav-item__remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const imdbID = btn.dataset.imdbid;
      const fav = favorites.find((f) => f.imdbID === imdbID);
      toggleFavorite({
        imdbID,
        Title: fav?.Title,
        Poster: fav?.Poster,
        Year: fav?.Year,
      });
      const updated = getFavorites();
      updateFavoritesCount(updated.length);
      renderFavoritesPanel(updated);
      showToast(`💔 "${fav?.Title}" favorilerden çıkarıldı.`, "info");
    });
  });
}

/** Favoriler panelini açar. */
function openFavoritesPanel() {
  const panel = _el("favorites-panel");
  const backdrop = _el("favorites-backdrop");
  const favBtn = _el("favorites-btn");

  renderFavoritesPanel(getFavorites());

  panel.classList.add("favorites-panel--open");
  panel.setAttribute("aria-hidden", "false");
  backdrop.classList.add("favorites-backdrop--visible");
  favBtn?.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";

  // Panel kapatma butonu
  _el("close-favorites-btn")?.addEventListener("click", closeFavoritesPanel, {
    once: true,
  });
}

/** Favoriler panelini kapatır. */
function closeFavoritesPanel() {
  const panel = _el("favorites-panel");
  const backdrop = _el("favorites-backdrop");
  const favBtn = _el("favorites-btn");

  // aria-hidden set etmeden ÖNCE focus'u panelin dışına taşı.
  // Aksi hâlde "Blocked aria-hidden on a focused element" uyarısı çıkar.
  if (panel && panel.contains(document.activeElement)) {
    favBtn?.focus();
  }

  panel.classList.remove("favorites-panel--open");
  panel.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("favorites-backdrop--visible");
  favBtn?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

/**
 * Header'daki favori sayı rozetini günceller.
 * @param {number} count
 */
function updateFavoritesCount(count) {
  const badge = _el("favorites-count");
  if (!badge) return;
  badge.textContent = count;
  badge.hidden = count === 0;
  badge.dataset.count = count;
}

// --------------------------------------------------------------------------
// Toast Bildirimleri
// --------------------------------------------------------------------------

/**
 * Ekranın sağ alt köşesinde kısa süreli bildirim gösterir.
 * @param {string} message   - Gösterilecek mesaj
 * @param {"success"|"error"|"info"} [type="info"] - Bildirim tipi
 * @param {number} [duration=3000] - Görünme süresi (ms)
 */
function showToast(message, type = "info", duration = 3000) {
  const container = _el("toast-container");
  if (!container) return;

  const icons = { success: "✅", error: "❌", info: "ℹ️" };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${icons[type] ?? "ℹ️"}</span>
    <span class="toast__message">${_esc(message)}</span>`;

  container.appendChild(toast);

  // CSS animasyonu duration'a göre ayarlanıyor
  const fadeDelay = duration - 400;
  toast.style.animationDuration = `0.3s, 0.4s`;
  toast.style.animationDelay = `0s, ${fadeDelay}ms`;

  setTimeout(() => {
    toast.remove();
  }, duration);
}

// --------------------------------------------------------------------------
// Yardımcı (Private) Fonksiyonlar
// --------------------------------------------------------------------------

/**
 * XSS koruması için string'i HTML-safe hale getirir.
 * @param {any} str
 * @returns {string}
 */
function _esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * OMDB type değerini Türkçe etikete çevirir.
 * @param {string} type
 * @returns {string}
 */
function _typeLabel(type) {
  const map = { movie: "🎬 Film", series: "📺 Dizi", episode: "🎞️ Bölüm" };
  return map[type] ?? type ?? "";
}

/**
 * Bir alan varsa HTML renderlar, "N/A" veya boşsa boş string döner.
 * @param {string} className  - Wrapper element class'ı
 * @param {string} value      - OMDB API değeri
 * @param {function} template - Değeri HTML'e dönüştüren fonksiyon
 * @returns {string}
 */
function _field(className, value, template) {
  if (!value || value === "N/A") return "";
  return `<p class="${className}">${template(_esc(value))}</p>`;
}

/**
 * Sayfalama için gösterilecek sayfa numarası dizisini hesaplar.
 * Örn: [1, "...", 4, 5, 6, "...", 20]
 * @param {number} current
 * @param {number} total
 * @returns {(number|string)[]}
 */
function _getPageRange(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];

  pages.push(1);

  if (current > 3) pages.push("...");

  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}

/**
 * IMDb ID ile film detayını getirir, modal açar.
 * @param {string} imdbID
 */
async function _openDetail(imdbID) {
  renderModalLoading();
  try {
    const movie = await getMovieDetail(imdbID);
    renderMovieDetail(movie);
  } catch (err) {
    closeModal();
    showToast(err.message, "error");
  }
}
