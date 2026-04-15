const url = 'https://s.shopee.co.id/5AoSuo4AG1';

async function test() {
  try {
    const res = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(url));
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
