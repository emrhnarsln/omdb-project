/**
 * config.example.js
 *
 * Bu dosyayı kopyalayın: config.js
 * config.js dosyasına kendi OMDB API key'inizi yazın.
 * API key almak için: https://www.omdbapi.com/apikey.aspx
 *
 * ⚠️ config.js dosyası .gitignore'a eklidir, commit edilmeyecek.
 */

const CONFIG = {
  OMDB_API_KEY: "YOUR_API_KEY_HERE",
  OMDB_BASE_URL: "https://www.omdbapi.com/",
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 dakika
  RESULTS_PER_PAGE: 10,              // OMDB API default sayfa boyutu
};
