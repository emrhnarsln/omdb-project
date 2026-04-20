/**
 * api.js
 * OMDB API ile tüm iletişimi yöneten modül.
 * Dışa açılan fonksiyonlar: searchMovies, getMovieDetail
 */

/**
 * OMDB API üzerinde film arama yapar.
 * @param {string} query - Aranacak film/dizi adı
 * @param {number} [page=1] - Sayfa numarası (her sayfa 10 sonuç)
 * @param {{type?: string, year?: string}} [filters={}] - Opsiyonel filtreler
 * @returns {Promise<{movies: Array, totalResults: number}>}
 */
async function searchMovies(query, page = 1, filters = {}) {
  let url =
    `${CONFIG.OMDB_BASE_URL}` +
    `?s=${encodeURIComponent(query)}` +
    `&page=${page}` +
    `&apikey=${CONFIG.OMDB_API_KEY}`;

  if (filters.type && filters.type !== "all") {
    url += `&type=${encodeURIComponent(filters.type)}`;
  }

  if (filters.year && String(filters.year).trim() !== "") {
    url += `&y=${encodeURIComponent(String(filters.year).trim())}`;
  }

  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    throw new Error(
      "Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.",
    );
  }

  if (!response.ok) {
    throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Sunucudan geçersiz yanıt alındı.");
  }

  if (data.Response === "False") {
    throw new Error(data.Error || "Film bulunamadı.");
  }

  return {
    movies: data.Search,
    totalResults: parseInt(data.totalResults, 10),
  };
}

/**
 * Belirli bir filmin/dizinin tam detaylarını getirir.
 * @param {string} imdbID - IMDb kimlik numarası (örn: "tt1234567")
 * @returns {Promise<Object>} Film detay objesi
 */
async function getMovieDetail(imdbID) {
  const url =
    `${CONFIG.OMDB_BASE_URL}` +
    `?i=${encodeURIComponent(imdbID)}` +
    `&plot=full` +
    `&apikey=${CONFIG.OMDB_API_KEY}`;

  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    throw new Error(
      "Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.",
    );
  }

  if (!response.ok) {
    throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Sunucudan geçersiz yanıt alındı.");
  }

  if (data.Response === "False") {
    throw new Error(data.Error || "Film detayı alınamadı.");
  }

  return data;
}
