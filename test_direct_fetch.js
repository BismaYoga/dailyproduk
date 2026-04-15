const url = 'https://s.shopee.co.id/5AoSuo4AG1';

async function test() {
  try {
    const res = await fetch(url, { 
      redirect: 'follow',
      headers: {
        'User-Agent': 'WhatsApp/2.21.12.21 A'
      }
    });
    const text = await res.text();
    const ogMatch = text.match(/<meta\s+(?:property|name)=['"]og:image['"]\s+content=['"](.*?)['"]/i);
    const twMatch = text.match(/<meta\s+(?:property|name)=['"]twitter:image['"]\s+content=['"](.*?)['"]/i);
    console.log("Raw HTML OG Image Match: ", ogMatch ? ogMatch[1] : (twMatch ? twMatch[1] : 'Not found'));
    
    // Sometimes it's inside JSON-LD or script tags
    const imgMatch = text.match(/"image":\s*"([^"]+)"/i);
    console.log("Script Image Match: ", imgMatch ? imgMatch[1] : 'Not found');
  } catch(e) {
    console.log(e);
  }
}
test();
