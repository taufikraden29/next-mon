"use client";
import { useEffect, useState, useRef } from "react";
import { FaArrowUp, FaArrowDown, FaExchangeAlt, FaCheckCircle, FaExclamationCircle, FaSearch, FaInfoCircle, FaBell } from 'react-icons/fa'; // Tambah FaBell

export default function Home() {
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previousGroupedData, setPreviousGroupatedData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [tooltip, setTooltip] = useState({
    visible: false,
    content: "",
    x: 0,
    y: 0,
  });

  // State baru untuk menyimpan daftar perubahan
  const [changeLog, setChangeLog] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scraper");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log("Data diterima dari API:", data);

      const { processedData, changes } = compareAndLogChanges(previousGroupedData, data); // Ambil perubahan juga

      setPreviousGroupatedData(data);
      setGroupedData(Array.isArray(processedData) ? processedData : []);

      // Tambahkan perubahan ke changeLog
      if (changes.length > 0) {
        setChangeLog(prevLog => [...changes, ...prevLog].slice(0, 20)); // Simpan 20 perubahan terbaru
      }

    } catch (err) {
      console.error("Error saat fetching data:", err);
      setError(err.message);
      setGroupedData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // const intervalId = setInterval(fetchData, 30000); 
    // return () => clearInterval(intervalId);
  }, []);

  // Fungsi yang dimodifikasi untuk mengembalikan data dan log perubahan
  const compareAndLogChanges = (oldData, newData) => {
    const changes = [];

    const processedData = newData.map(newCategory => {
      const oldCategory = oldData.find(oldCat => oldCat.title === newCategory.title);

      return {
        ...newCategory,
        items: newCategory.items.map(newItem => {
          const oldItem = oldCategory ? oldCategory.items.find(oldIt => oldIt.kode === newItem.kode) : null;

          let priceChanged = false;
          let statusChanged = false;
          let oldPrice = null;
          let oldStatus = null;

          if (oldItem) {
            const oldHargaNum = Number(oldItem.harga.replace('.', ''));
            const newHargaNum = Number(newItem.harga.replace('.', ''));
            if (oldHargaNum !== newHargaNum) {
              priceChanged = true;
              oldPrice = oldItem.harga;
              const priceTrend = newHargaNum > oldHargaNum ? "naik" : "turun";
              changes.push({
                type: 'harga',
                category: newCategory.title,
                item: newItem.keterangan,
                kode: newItem.kode,
                old: `Rp ${oldHargaNum.toLocaleString('id-ID')}`,
                new: `Rp ${newHargaNum.toLocaleString('id-ID')}`,
                trend: priceTrend,
                timestamp: new Date().toLocaleString(),
              });
            }

            if (oldItem.status !== newItem.status) {
              statusChanged = true;
              oldStatus = oldItem.status;
              changes.push({
                type: 'status',
                category: newCategory.title,
                item: newItem.keterangan,
                kode: newItem.kode,
                old: oldItem.status,
                new: newItem.status,
                timestamp: new Date().toLocaleString(),
              });
            }
          }

          return {
            ...newItem,
            changed: {
              price: priceChanged,
              status: statusChanged,
              oldPrice: oldPrice,
              oldStatus: oldStatus,
              newPrice: newItem.harga,
              newStatus: newItem.status
            }
          };
        })
      };
    });
    return { processedData, changes }; // Mengembalikan data yang diproses dan log perubahan
  };

  const showTooltip = (e, content) => {
    setTooltip({
      visible: true,
      content: content,
      x: e.clientX + 10,
      y: e.clientY + 10,
    });
  };

  const hideTooltip = () => {
    setTooltip({ ...tooltip, visible: false });
  };

  const filteredGroupedData = groupedData.filter(category => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    const categoryMatches = category.title.toLowerCase().includes(query);

    const itemMatches = category.items.some(item =>
      item.keterangan.toLowerCase().includes(query) ||
      item.kode.toLowerCase().includes(query)
    );

    return categoryMatches || itemMatches;
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 text-white animate-fade-in">
        <div className="text-center p-8 bg-white/15 rounded-2xl shadow-2xl animate-pulse">
          <p className="text-2xl font-bold mb-4">Sedang Mengambil Data Harga...</p>
          <div className="mt-4 w-20 h-20 border-4 border-t-4 border-white border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-700 text-white animate-fade-in">
        <div className="text-center p-8 bg-black/30 rounded-2xl shadow-2xl">
          <p className="text-2xl font-bold">Terjadi Kesalahan Fatal!</p>
          <p className="mt-4 text-red-200 text-lg">{error}</p>
          <p className="mt-6 text-sm italic">Mohon coba refresh halaman atau hubungi administrator.</p>
        </div>
      </div>
    );
  }

  if (groupedData.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-700 to-gray-900 text-white animate-fade-in">
        <div className="text-center p-8 bg-white/10 rounded-2xl shadow-xl">
          <p className="text-2xl font-bold">Data Tidak Ditemukan!</p>
          <p className="mt-4 text-gray-300 text-lg">Pastikan sumber data API aktif dan benar.</p>
          <p className="mt-6 text-sm italic">Coba refresh atau periksa konfigurasi server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 sm:p-8">
      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-10 drop-shadow-lg leading-tight">
        ✨ Pemantauan Harga Real-Time ✨
      </h1>

      {/* Input Pencarian */}
      <div className="max-w-xl mx-auto mb-10 p-4 bg-white rounded-xl shadow-lg flex items-center border border-blue-200">
        <FaSearch className="text-gray-400 mr-3 text-lg" />
        <input
          type="text"
          placeholder="Cari kategori atau keterangan produk..."
          className="flex-grow p-2 outline-none text-gray-800 text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="ml-3 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Deskripsi Perubahan (Change Log) */}
      {changeLog.length > 0 && (
        <div className="max-w-3xl mx-auto mb-10 p-6 bg-yellow-50 rounded-xl shadow-lg border border-yellow-300 animate-fade-in">
          <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center">
            <FaBell className="mr-3 text-yellow-600 text-2xl" /> Perubahan Terdeteksi!
          </h2>
          <ul className="list-disc pl-5 text-gray-700">
            {changeLog.map((log, index) => (
              <li key={index} className="mb-2 text-sm">
                <span className="font-semibold text-gray-900">[{log.timestamp}]</span> Kategori: "{log.category}", Produk: "{log.item}" ({log.kode}) - {' '}
                {log.type === 'harga' ? (
                  <span className={log.trend === 'naik' ? 'text-red-600' : 'text-green-600'}>
                    Harga <span className="font-bold">{log.trend}</span> dari <span className="font-bold">{log.old}</span> menjadi <span className="font-bold">{log.new}</span>.
                  </span>
                ) : (
                  <span className="text-purple-600">
                    Status berubah dari <span className="font-bold">{log.old}</span> menjadi <span className="font-bold">{log.new}</span>.
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs italic text-gray-600">
            *Daftar ini menunjukkan perubahan yang terdeteksi sejak halaman dimuat.
          </p>
        </div>
      )}


      {filteredGroupedData.length === 0 && searchQuery ? (
        <div className="text-center py-10">
          <p className="text-xl text-gray-600">Tidak ada hasil ditemukan untuk "{searchQuery}".</p>
        </div>
      ) : (
        filteredGroupedData.map((category, catIndex) => (
          <div key={catIndex} className="mb-8 bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-500 transform transition-transform duration-300 hover:scale-[1.01]">
            <h2 className="text-2xl font-bold text-white p-4 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-600 shadow-md mb-6 flex items-center justify-between">
              <span>{category.title || "Kategori Tanpa Judul"}</span>
            </h2>

            {category.items && category.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                  <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-tl-lg">Kode</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Keterangan</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Harga</th>
                      <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-tr-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {category.items.map((item, itemIndex) => (
                      <tr
                        key={item.kode || itemIndex}
                        className={`hover:bg-blue-50 transition-colors duration-200 
                                    ${itemIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.kode}</td>
                        <td className="px-5 py-3 text-sm text-gray-800 break-words max-w-xs">{item.keterangan}</td>
                        <td
                          className={`px-5 py-3 whitespace-nowrap text-sm font-bold 
                                      ${item.changed?.price ? (Number(item.harga.replace('.', '')) > Number(item.changed.oldPrice.replace('.', '')) ? 'text-red-600 animate-pulse' : 'text-green-600 animate-pulse') : 'text-gray-800'}`}
                          onMouseEnter={(e) => item.changed?.price && showTooltip(e, `Harga Berubah:\nLama: Rp ${Number(item.changed.oldPrice.replace('.', '')).toLocaleString('id-ID')}\nBaru: Rp ${Number(item.harga.replace('.', '')).toLocaleString('id-ID')}`)}
                          onMouseLeave={hideTooltip}
                        >
                          Rp {item.harga ? Number(item.harga.replace('.', '')).toLocaleString('id-ID') : 'N/A'}
                          {item.changed?.price && (
                            <span className="ml-2 text-base">
                              {Number(item.harga.replace('.', '')) > Number(item.changed.oldPrice.replace('.', '')) ? (
                                <FaArrowUp className="inline-block text-red-500" />
                              ) : (
                                <FaArrowDown className="inline-block text-green-500" />
                              )}
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-5 py-3 whitespace-nowrap text-sm font-bold flex items-center
                                      ${item.changed?.status ? 'text-purple-600 animate-bounce' : (item.status === 'Open' ? 'text-green-600' : 'text-red-600')}`}
                          onMouseEnter={(e) => item.changed?.status && showTooltip(e, `Status Berubah:\nLama: ${item.changed.oldStatus}\nBaru: ${item.status}`)}
                          onMouseLeave={hideTooltip}
                        >
                          {item.status}
                          {item.status === 'Open' && <FaCheckCircle className="ml-1 text-base" />}
                          {item.status === 'Gangguan' && <FaExclamationCircle className="ml-1 text-base" />}
                          {item.changed?.status && (
                            <span className="ml-2 text-base"><FaExchangeAlt className="inline-block" /></span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic text-center py-4 text-md">
                <FaInfoCircle className="inline-block mr-2" /> Tidak ada item dalam kategori ini.
              </p>
            )}
          </div>
        ))
      )}

      {tooltip.visible && (
        <div
          className="fixed z-50 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-pre-wrap pointer-events-none opacity-95 transition-opacity duration-100"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}