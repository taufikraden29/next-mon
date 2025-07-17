import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
    try {
        const url = 'https://himalayareload.otoreport.com/harga.js.php?id=b61804374cb7e3d207028ac05b492f82265047801111a2c0bc3bb288a7a843341b24cdc21347fbc9ba602392b435df468647-6';
        console.log("Server: Mencoba fetch dari URL:", url);

        const response = await fetch(url);
        console.log("Server: Response status:", response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        // console.log("Server: HTML yang diterima (awal 500 karakter):", html.substring(0, 500)); 
        // console.log("Server: Panjang HTML:", html.length); // Untuk debugging, pastikan HTML tidak kosong

        const $ = cheerio.load(html);

        const groupedData = []; // Ini akan menyimpan hasil akhir yang dikelompokkan
        let currentCategory = null;

        // Iterasi melalui setiap baris dalam tabel
        $('table.tabel tr').each((i, row) => {
            const $row = $(row);

            // Cek apakah ini baris kategori (dengan colspan="6")
            if ($row.find('td[colspan="6"]').length > 0) {
                const categoryTitle = $row.find('td[colspan="6"]').text().trim();
                if (categoryTitle) {
                    currentCategory = {
                        title: categoryTitle,
                        items: []
                    };
                    groupedData.push(currentCategory);
                }
            }
            // Cek apakah ini baris data (td1 atau td2) dan ada kategori aktif
            else if (($row.hasClass('td1') || $row.hasClass('td2')) && currentCategory) {
                const cols = $row.find('td');
                if (cols.length === 4) { // Pastikan ada 4 kolom data
                    const statusText = $(cols[3]).find('span').text().trim(); // Ambil teks dari dalam span

                    currentCategory.items.push({
                        kode: $(cols[0]).text().trim(),
                        keterangan: $(cols[1]).text().trim(),
                        harga: $(cols[2]).text().trim(),
                        status: statusText,
                    });
                } else {
                    // console.warn(`Server: Baris data (${$row.attr('class')}) diabaikan karena jumlah kolom tidak 4. Konten: ${$row.text().trim().substring(0, 100)}`);
                }
            }
            // Abaikan baris header kolom (yang memiliki class="head" tapi bukan colspan="6")
            // if ($row.hasClass('head') && $row.find('td[colspan="6"]').length === 0) {
            //     // console.log("Server: Mengabaikan baris header kolom.");
            // }
        });

        console.log("Server: Data FINAL yang dikelompokkan akan dikirim:", JSON.stringify(groupedData, null, 2).substring(0, 500) + '...'); // Log sebagian
        return NextResponse.json(groupedData);

    } catch (err) {
        console.error("Server ERROR:", err);
        return NextResponse.json({ error: 'Failed to fetch or parse data.', details: err.message }, { status: 500 });
    }
}