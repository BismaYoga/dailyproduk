import { createPool } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    const client = createPool({
      connectionString: process.env.DB_POSTGRES_URL_NON_POOLING || process.env.DB_DATABASE_URL || process.env.DB_POSTGRES_URL || process.env.POSTGRES_URL,
    });

    // Auto-migrate schema lazily to support url_shopee
    try {
      await client.sql`ALTER TABLE katalog ADD COLUMN IF NOT EXISTS url_shopee TEXT`;
    } catch(e) { /* ignore */ }

    // GET method is public
    if (req.method === 'GET') {
      const { q } = req.query;
      const { rows } = q 
        ? await client.sql`SELECT * FROM katalog WHERE kode::text = ${q}`
        : await client.sql`SELECT * FROM katalog ORDER BY id ASC`;
      return res.status(200).json(rows);
    }

    // Basic Authentication for POST, PUT, DELETE
    const authHeader = req.headers.authorization;
    if (authHeader !== 'dailyadmin123') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Helper fetch OpenGraph Shopee Image via Microlink
    async function getShopeeImage(shopeeUrl) {
      if(!shopeeUrl || !shopeeUrl.includes('shopee.')) return '';
      try {
        const mlRes = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(shopeeUrl));
        const mlData = await mlRes.json();
        return mlData.data?.image?.url || '';
      } catch(e) {
        return '';
      }
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { nama, harga, kode, url } = body;
      const shopee_img = await getShopeeImage(url);
      
      await client.sql`INSERT INTO katalog (nama, harga, kode, url_gambar, url_shopee) VALUES (${nama}, ${harga}, ${kode}, ${shopee_img}, ${url})`;
      return res.status(200).json({ success: true, img: shopee_img });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, nama, harga, kode, url } = body;
      const shopee_img = await getShopeeImage(url);

      await client.sql`UPDATE katalog SET nama = ${nama}, harga = ${harga}, kode = ${kode}, url_gambar = ${shopee_img}, url_shopee = ${url} WHERE id = ${id}`;
      return res.status(200).json({ success: true, img: shopee_img });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await client.sql`DELETE FROM katalog WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}