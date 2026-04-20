/**
 * app.js
 * Uygulamanın ana orkestratörü.
 *
 * Sorumluluklar:
 *   - Global AppState yönetimi
 *   - Event listener kurulumu
 *   - Modüller arası koordinasyon (api ↔ ui ↔ storage)
 *   - URL parametresi ile durum senkronizasyonu
 *   - Arama geçmişi yönetimi
 *   - Filtre (tür, yıl) yönetimi
 *   - Favoriler paneli kontrolü
 */

// --------------------------------------------------------------------------
// Yardımcı: Debounce
// --------------------------------------------------------------------------

/**
 * Verilen fonksiyonu belirli bir gecikmeyle çağırır.
 * Gecikme dolmadan tekrar çağrılırsa timer sıfırlanır.
 * @param {Function} fn
 * @param {number} delay - Milisaniye cinsinden gecikme
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// --------------------------------------------------------------------------
// Global Uygulama State'i
// --------------------------------------------------------------------------

const AppState = {
  /** Mevcut arama sorgusu */
  query: "",

  /** Mevcut sayfa numarası */
  page: 1,

  /** Toplam sonuç sayısı */
  totalResults: 0,

  /** Yükleniyor mu? */
  isLoading: false,

  /** Aktif filtreler */
  filters: {
    type: "all", // "all" | "movie" | "series" | "episode"
    year: "", // Boş string veya 4 haneli yıl
  },

  // ------------------------------------------------------------------------
  // Arama
  // ------------------------------------------------------------------------

  /**
   * Yeni bir arama başlatır.
   * @param {string} query - Aranacak film/dizi adı
   * @param {number} [page=1] - Sayfa numarası
   * @param {boolean} [replaceHistory=false] - true ise pushState yerine replaceState kullanır
   *   (popstate geri yüklemelerinde ileri geçmişini korumak için)
   */
  async search(query, page = 1, replaceHistory = false) {
    if (!query || !query.trim()) return;
    if (this.isLoading) return;

    this.query = query.trim();
    this.page = page;
    this.isLoading = true;

    // Input'u güncelle (restore senaryosu için)
    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value !== this.query) {
      searchInput.value = this.query;
    }

    // URL'i güncelle → replaceHistory=true ise geçmiş yığınını bozmadan değiştir
    if (replaceHistory) {
      this._replaceURL();
    } else {
      this._syncURL();
    }

    // Arama geçmişine ekle
    addToSearchHistory(this.query);

    // Son aramayı kaydet
    saveLastSearch(this.query, this.page);

    // UI: yükleniyor
    renderLoading();
    hideSearchHistoryDropdown();

    // Cache anahtarı: query + page + filtreler
    const cacheKey = this._buildCacheKey();
    const cached = getCachedResults(cacheKey);

    try {
      let result;
      if (cached) {
        result = cached;
      } else {
        result = await searchMovies(this.query, this.page, this.filters);
        setCachedResults(cacheKey, result);
      }

      this.totalResults = result.totalResults;
      renderMovieCards(result.movies, result.totalResults, this.page);
      renderPagination(this.page, result.totalResults);
    } catch (error) {
      renderError(error.message);
      this.totalResults = 0;
    } finally {
      this.isLoading = false;
    }
  },

  /**
   * Belirli bir sayfaya gider.
   * @param {number} page
   */
  goToPage(page) {
    this.search(this.query, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  // ------------------------------------------------------------------------
  // Filtreler
  // ------------------------------------------------------------------------

  /**
   * Bir filtreyi günceller ve eğer aktif arama varsa yeniden arar.
   * @param {"type"|"year"} key
   * @param {string} value
   */
  setFilter(key, value) {
    this.filters[key] = value;
    this._updateFilterUI();
    if (this.query) {
      this.search(this.query, 1);
    }
  },

  /** Tüm filtreleri sıfırlar. */
  clearFilters() {
    this.filters.type = "all";
    this.filters.year = "";

    const typeSelect = document.getElementById("filter-type");
    const yearInput = document.getElementById("filter-year");
    if (typeSelect) typeSelect.value = "all";
    if (yearInput) yearInput.value = "";

    this._updateFilterUI();

    if (this.query) {
      this.search(this.query, 1);
    }
  },

  /**
   * Filtre kontrollerinin görsel durumunu günceller.
   * (Aktif filtre highlight + "Temizle" butonu gösterimi)
   */
  _updateFilterUI() {
    const typeSelect = document.getElementById("filter-type");
    const yearInput = document.getElementById("filter-year");
    const clearBtn = document.getElementById("clear-filters-btn");

    const hasActiveFilter =
      this.filters.type !== "all" || this.filters.year !== "";

    if (typeSelect) {
      typeSelect.classList.toggle(
        "filter--active",
        this.filters.type !== "all",
      );
    }
    if (yearInput) {
      yearInput.classList.toggle("filter--active", this.filters.year !== "");
    }
    if (clearBtn) {
      clearBtn.hidden = !hasActiveFilter;
    }
  },

  // ------------------------------------------------------------------------
  // Favoriler Paneli — ui.js fonksiyonlarına yönlendirme
  // ------------------------------------------------------------------------

  /** Favoriler panelini açar (ui.js'teki canonical implementasyona yönlendirir). */
  openFavoritesPanel() {
    openFavoritesPanel();
  },

  /** Favoriler panelini kapatır (ui.js'teki canonical implementasyona yönlendirir). */
  closeFavoritesPanel() {
    closeFavoritesPanel();
  },

  // ------------------------------------------------------------------------
  // Yardımcı (private)
  // ------------------------------------------------------------------------

  /** Cache anahtarı oluşturur (query + page + filtreler). */
  _buildCacheKey() {
    const typeStr =
      this.filters.type !== "all" ? `_t:${this.filters.type}` : "";
    const yearStr = this.filters.year ? `_y:${this.filters.year}` : "";
    return `${this.query}_p${this.page}${typeStr}${yearStr}`;
  },

  /** URL'i mevcut state ile senkronize eder (pushState — yeni geçmiş girişi ekler). */
  _syncURL() {
    window.history.pushState({}, "", this._buildURL());
  },

  /**
   * URL'i mevcut state ile senkronize eder (replaceState — mevcut girişi değiştirir,
   * ileri/geri geçmişini bozmaz). popstate geri yüklemelerinde kullanılır.
   */
  _replaceURL() {
    window.history.replaceState({}, "", this._buildURL());
  },

  /** Mevcut state'e göre URL nesnesi oluşturur. */
  _buildURL() {
    const url = new URL(window.location);
    url.searchParams.set("q", this.query);
    url.searchParams.set("page", String(this.page));

    if (this.filters.type !== "all") {
      url.searchParams.set("type", this.filters.type);
    } else {
      url.searchParams.delete("type");
    }

    if (this.filters.year) {
      url.searchParams.set("year", this.filters.year);
    } else {
      url.searchParams.delete("year");
    }

    return url;
  },
};

// --------------------------------------------------------------------------
// Event Listener Kurulumu
// --------------------------------------------------------------------------

function initEventListeners() {
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const filterType = document.getElementById("filter-type");
  const filterYear = document.getElementById("filter-year");
  const clearFiltersBtn = document.getElementById("clear-filters-btn");
  const favoritesBtn = document.getElementById("favorites-btn");
  const closeFavoritesBtn = document.getElementById("close-favorites-btn");
  const favoritesBackdrop = document.getElementById("favorites-backdrop");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const modalOverlay = document.getElementById("modal-overlay");
  const resultsGrid = document.getElementById("results-grid");

  // --- Arama Butonu ---
  searchBtn?.addEventListener("click", () => {
    AppState.search(searchInput.value);
  });

  // --- Enter tuşu ile arama ---
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      AppState.search(searchInput.value);
    }
    if (e.key === "Escape") {
      hideSearchHistoryDropdown();
      searchInput.blur();
    }
  });

  // --- Input odaklanınca geçmişi göster (debounce) ---
  const debouncedShowHistory = debounce(() => {
    const history = getSearchHistory();
    if (history.length > 0) {
      renderSearchHistory(history, (selectedQuery) => {
        searchInput.value = selectedQuery;
        hideSearchHistoryDropdown();
        AppState.search(selectedQuery);
      });
      showSearchHistoryDropdown();
    }
  }, 150);

  searchInput?.addEventListener("focus", () => {
    debouncedShowHistory();
  });

  // Input yazınca geçmişi filtrele
  searchInput?.addEventListener("input", () => {
    const val = searchInput.value.trim();
    const history = getSearchHistory();

    if (!val) {
      // Boşsa tüm geçmişi göster
      if (history.length > 0) {
        renderSearchHistory(history, (selectedQuery) => {
          searchInput.value = selectedQuery;
          hideSearchHistoryDropdown();
          AppState.search(selectedQuery);
        });
        showSearchHistoryDropdown();
      } else {
        hideSearchHistoryDropdown();
      }
      return;
    }

    // Yazılanla eşleşen geçmiş öğelerini göster
    const filtered = history.filter((item) =>
      item.toLowerCase().includes(val.toLowerCase()),
    );

    if (filtered.length > 0) {
      renderSearchHistory(filtered, (selectedQuery) => {
        searchInput.value = selectedQuery;
        hideSearchHistoryDropdown();
        AppState.search(selectedQuery);
      });
      showSearchHistoryDropdown();
    } else {
      hideSearchHistoryDropdown();
    }
  });

  // Input dışına tıklanınca geçmişi gizle
  document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".search-bar__input-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      hideSearchHistoryDropdown();
    }
  });

  // --- Geçmişi Temizle ---
  clearHistoryBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    clearSearchHistory();
    hideSearchHistoryDropdown();
    showToast("Arama geçmişi temizlendi.", "info");
  });

  // --- Filtre: Tür ---
  filterType?.addEventListener("change", () => {
    AppState.setFilter("type", filterType.value);
  });

  // --- Filtre: Yıl (debounce ile) ---
  const debouncedYearFilter = debounce(() => {
    const val = filterYear.value.trim();
    // 4 haneli yıl kontrolü
    if (
      val === "" ||
      (val.length === 4 && Number(val) >= 1888 && Number(val) <= 2030)
    ) {
      AppState.setFilter("year", val);
    }
  }, 500);

  filterYear?.addEventListener("input", debouncedYearFilter);

  // --- Filtreleri Temizle ---
  clearFiltersBtn?.addEventListener("click", () => {
    AppState.clearFilters();
    showToast("Filtreler temizlendi.", "info");
  });

  // --- Favoriler Butonu (Aç) ---
  favoritesBtn?.addEventListener("click", () => {
    AppState.openFavoritesPanel();
  });

  // --- Favoriler Kapat Butonu ---
  closeFavoritesBtn?.addEventListener("click", () => {
    AppState.closeFavoritesPanel();
  });

  // --- Backdrop tıklaması (favoriler kapat) ---
  favoritesBackdrop?.addEventListener("click", () => {
    AppState.closeFavoritesPanel();
  });

  // --- Film kartına tıklayınca detay getir ---
  resultsGrid?.addEventListener("click", (e) => {
    const card = e.target.closest(".movie-card");
    if (!card || card.classList.contains("movie-card--skeleton")) return;
    openMovieDetail(card.dataset.imdbid);
  });

  // --- Klavye ile film kartı seçimi (a11y) ---
  resultsGrid?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".movie-card");
    if (!card || card.classList.contains("movie-card--skeleton")) return;
    e.preventDefault();
    openMovieDetail(card.dataset.imdbid);
  });

  // Not: Favoriler listesi içindeki tıklama olayları renderFavoritesPanel()
  // içinde per-item listener olarak yönetilmektedir (ui.js). Çift tetiklenme
  // olmaması için burada ayrıca delegated listener kurulmaz.

  // --- Modal arka planına tıklanınca kapat ---
  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  });

  // --- ESC tuşu ile kapat ---
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Modal açıksa önce modalı kapat
      if (
        document
          .getElementById("modal-overlay")
          ?.classList.contains("modal--open")
      ) {
        closeModal();
      } else {
        AppState.closeFavoritesPanel();
      }
    }
  });

  // --- Tarayıcı geri/ileri tuşları (popstate) ---
  // replaceHistory=true → search() içinde replaceState kullanılır,
  // böylece popstate restore işlemi yeni pushState eklemez ve
  // ileri (forward) geçmişi bozulmaz.
  window.addEventListener("popstate", () => {
    restoreFromURL(true);
  });
}

// --------------------------------------------------------------------------
// Film Detayı Açma
// --------------------------------------------------------------------------

/**
 * Bir filmin detayını modal'da gösterir.
 * @param {string} imdbID
 */
async function openMovieDetail(imdbID) {
  if (!imdbID) return;

  renderModalLoading();

  try {
    const movie = await getMovieDetail(imdbID);
    renderMovieDetail(movie);
  } catch (error) {
    closeModal();
    showToast(`Detay yüklenemedi: ${error.message}`, "error");
  }
}

// --------------------------------------------------------------------------
// Durum Geri Yükleme
// --------------------------------------------------------------------------

/**
 * URL parametrelerinden mevcut sorgu ve filtreleri okur ve aramayı başlatır.
 * @param {boolean} [replaceHistory=false] - popstate'den çağrılıyorsa true — ileri geçmişini korur
 */
function restoreFromURL(replaceHistory = false) {
  const params = new URLSearchParams(window.location.search);
  const queryFromURL = params.get("q");
  const pageFromURL = parseInt(params.get("page"), 10) || 1;
  const typeFromURL = params.get("type") || "all";
  const yearFromURL = params.get("year") || "";

  if (queryFromURL) {
    // Filtreleri URL'den restore et
    AppState.filters.type = typeFromURL;
    AppState.filters.year = yearFromURL;

    // Filtre kontrollerini güncelle
    const typeSelect = document.getElementById("filter-type");
    const yearInput = document.getElementById("filter-year");
    if (typeSelect) typeSelect.value = typeFromURL;
    if (yearInput) yearInput.value = yearFromURL;
    AppState._updateFilterUI();

    // replaceHistory=true → pushState kullanma, ileri geçmişini koru
    AppState.search(queryFromURL, pageFromURL, replaceHistory);
    return true;
  }

  return false;
}

/**
 * Sayfa açılışında son aramayı restore eder.
 * Öncelik: URL parametreleri > LocalStorage > boş state
 */
function restoreLastSearch() {
  // Önce URL'e bak
  if (restoreFromURL()) return;

  // URL'de yoksa LocalStorage'a bak
  const lastSearch = getLastSearch();
  if (lastSearch && lastSearch.query) {
    AppState.search(lastSearch.query, lastSearch.page || 1);
    return;
  }

  // Her ikisi de yoksa boş durumu göster
  renderEmpty();
}

// --------------------------------------------------------------------------
// Favoriler Sayacını Güncelle
// --------------------------------------------------------------------------

/**
 * Header'daki favoriler badge'ini günceller.
 */
function initFavoritesCount() {
  updateFavoritesCount(getFavorites().length);
}

// --------------------------------------------------------------------------
// Uygulamayı Başlat
// --------------------------------------------------------------------------

/**
 * Ana başlatma fonksiyonu. DOM hazır olduğunda çağrılır.
 */
function init() {
  initEventListeners();
  initFavoritesCount();
  restoreLastSearch();
}

document.addEventListener("DOMContentLoaded", init);
