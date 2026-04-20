/**
 * storage.js
 * LocalStorage üzerindeki tüm okuma/yazma işlemlerini yöneten modül.
 *
 * Dışa açılan fonksiyonlar:
 *   saveLastSearch, getLastSearch,
 *   getCachedResults, setCachedResults,
 *   getFavorites, toggleFavorite,
 *   getSearchHistory, addToSearchHistory, clearSearchHistory
 */

// --------------------------------------------------------------------------
// Sabitler
// --------------------------------------------------------------------------

const STORAGE_KEYS = {
  LAST_SEARCH: "omdb_last_search",
  CACHE_PREFIX: "omdb_cache_",
  FAVORITES: "omdb_favorites",
  SEARCH_HISTORY: "omdb_search_history",
};

const MAX_HISTORY_ITEMS = 5;

// --------------------------------------------------------------------------
// Son Arama
// --------------------------------------------------------------------------

/**
 * Son arama sorgusunu ve sayfa numarasını kaydeder.
 * @param {string} query
 * @param {number} [page=1]
 */
function saveLastSearch(query, page = 1) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.LAST_SEARCH,
      JSON.stringify({ query, page }),
    );
  } catch (e) {
    console.warn("saveLastSearch: LocalStorage yazma hatası", e);
  }
}

/**
 * Kaydedilmiş son aramayı döner.
 * @returns {{query: string, page: number} | null}
 */
function getLastSearch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_SEARCH);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("getLastSearch: Okuma/parse hatası", e);
    return null;
  }
}

// --------------------------------------------------------------------------
// Sonuç Cache'i
// --------------------------------------------------------------------------

/**
 * Belirli bir anahtar için cache'e kaydedilmiş veriyi döner.
 * Cache süresi dolmuşsa null döner.
 * @param {string} key
 * @returns {any | null}
 */
function getCachedResults(key) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    const isExpired = Date.now() - timestamp > CONFIG.CACHE_DURATION_MS;
    return isExpired ? null : data;
  } catch (e) {
    console.warn("getCachedResults: Okuma/parse hatası", e);
    return null;
  }
}

/**
 * Veriyi belirli bir anahtarla cache'e kaydeder.
 * LocalStorage doluysa sessizce atlar.
 * @param {string} key
 * @param {any} data
 */
function setCachedResults(key, data) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch (e) {
    // QuotaExceededError gibi durumlarda uygulamayı kırmıyoruz
    console.warn("setCachedResults: LocalStorage yazma hatası (kota?)", e);
  }
}

// --------------------------------------------------------------------------
// Favoriler
// --------------------------------------------------------------------------

/**
 * Favori filmlerin listesini döner.
 * @returns {Array<{imdbID: string, Title: string, Poster: string, Year: string}>}
 */
function getFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("getFavorites: Okuma/parse hatası", e);
    return [];
  }
}

/**
 * Bir filmi favorilere ekler veya çıkarır (toggle).
 * @param {{imdbID: string, Title: string, Poster: string, Year: string}} movie
 * @returns {boolean} true → eklendi, false → çıkarıldı
 */
function toggleFavorite(movie) {
  try {
    const favorites = getFavorites();
    const index = favorites.findIndex((f) => f.imdbID === movie.imdbID);

    if (index === -1) {
      favorites.push({
        imdbID: movie.imdbID,
        Title: movie.Title,
        Poster: movie.Poster,
        Year: movie.Year,
      });
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      return true;
    } else {
      favorites.splice(index, 1);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
      return false;
    }
  } catch (e) {
    console.warn("toggleFavorite: İşlem hatası", e);
    return false;
  }
}

// --------------------------------------------------------------------------
// Arama Geçmişi
// --------------------------------------------------------------------------

/**
 * Kaydedilmiş arama geçmişini döner (en yeniden eskiye sıralı).
 * @returns {string[]}
 */
function getSearchHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("getSearchHistory: Okuma/parse hatası", e);
    return [];
  }
}

/**
 * Bir sorguyu arama geçmişinin başına ekler.
 * Aynı sorgu varsa önce kaldırır (tekrar yok).
 * MAX_HISTORY_ITEMS limitini aşarsa eskiyi siler.
 * @param {string} query
 */
function addToSearchHistory(query) {
  if (!query || !query.trim()) return;
  try {
    const trimmed = query.trim();
    // Büyük/küçük harf farkı gözetmeksizin aynı öğeyi kaldır
    const history = getSearchHistory().filter(
      (item) => item.toLowerCase() !== trimmed.toLowerCase(),
    );
    history.unshift(trimmed);
    const limited = history.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(limited));
  } catch (e) {
    console.warn("addToSearchHistory: Yazma hatası", e);
  }
}

/**
 * Tüm arama geçmişini siler.
 */
function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  } catch (e) {
    console.warn("clearSearchHistory: Silme hatası", e);
  }
}
