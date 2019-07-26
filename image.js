const axios = require('axios');
const axiosRetry = require('axios-retry');
const fs = require('fs');
const pLimit = require('p-limit');


const interval = 100;
let from = 0;
let to = from + interval;

const concat = (x,y) =>
  x.concat(y)

const flatMap = (f,xs) =>
  xs.map(f).reduce(concat, [])


const limit = pLimit(5);
axiosRetry(axios, { retries: 1000, retryDelay: retryCount => retryCount * 500 });

(async () => {
    while (true) {
        await parseFile();
        from += interval;
        to += interval;
    }
})();

async function parseFile() {
    const fileName = `menu_from_${from}_to_${to}.json`;
    const json = await fs.promises.readFile(fileName, 'utf8');
    const data = [...JSON.parse(json)];
    return Promise.all(flatMap(it => it, data).map(async it => {
        return limit((x) => downloadImage(x.img, x.id), it);
    }));
}

async function downloadImage(url, id) {
    console.log(`downloading ${id} cover from ${url}...`)
    const cookie = await fs.promises.readFile('.cookie', 'utf8');
    const path = `images/${id}.jpg`;
    const writer = fs.createWriteStream(path);
    const response = await axios.get(url, {
        responseType: 'stream',
        headers: {
            Cookie: cookie
        }
    })
    response.data.pipe(writer)
    await new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}
