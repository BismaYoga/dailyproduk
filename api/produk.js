import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    const connectionString = process.env.DB_POSTGRES_URL_NON_POOLING || process.env.DB_DATABASE_URL || process.env.DB_POSTGRES_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error("Database URL is missing. Check your Vercel Environment Variables.");
    }

    const sql = neon(connectionString);

    // Auto-migrate schema lazily to support url_shopee
    try {
      await sql`ALTER TABLE katalog ADD COLUMN IF NOT EXISTS url_shopee TEXT`;
    } catch(e) { /* ignore */ }

    // GET method is public
    if (req.method === 'GET') {
      const { q } = req.query;
      const rows = q 
        ? await sql`SELECT * FROM katalog WHERE kode::text = ${q}`
        : await sql`SELECT * FROM katalog ORDER BY id ASC`;
      return res.status(200).json(rows);
    }

    // Basic Authentication for POST, PUT, DELETE
    const authHeader = req.headers.authorization;
    if (authHeader !== 'dailyadmin123') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Helper fetch OpenGraph Shopee Image via Native Fetch + WhatsApp User Agent
    async function getShopeeImage(shopeeUrl) {
      if(!shopeeUrl || !shopeeUrl.includes('shopee.')) return '';
      try {
        const res = await fetch(shopeeUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'WhatsApp/2.21.12.21 A'
          }
        });
        const text = await res.text();
        const ogMatch = text.match(/<meta\s+(?:property|name)=['"]og:image['"]\s+content=['"](.*?)['"]/i);
        const twMatch = text.match(/<meta\s+(?:property|name)=['"]twitter:image['"]\s+content=['"](.*?)['"]/i);
        return (ogMatch ? ogMatch[1] : (twMatch ? twMatch[1] : ''));
      } catch(e) {
        return '';
      }
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { nama, harga, kode, url } = body;
      const shopee_img = await getShopeeImage(url);
      
      await sql`INSERT INTO katalog (nama, harga, kode, url_gambar, url_shopee) VALUES (${nama}, ${harga}, ${kode}, ${shopee_img}, ${url})`;
      return res.status(200).json({ success: true, img: shopee_img });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { id, nama, harga, kode, url } = body;
      const shopee_img = await getShopeeImage(url);

      await sql`UPDATE katalog SET nama = ${nama}, harga = ${harga}, kode = ${kode}, url_gambar = ${shopee_img}, url_shopee = ${url} WHERE id = ${id}`;
      return res.status(200).json({ success: true, img: shopee_img });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await sql`DELETE FROM katalog WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}