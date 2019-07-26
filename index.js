const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require('axios');
const axiosRetry = require('axios-retry');
const pLimit = require('p-limit');
const fs = require('fs').promises;

const interval = 100;
let from = 2100;
let to = from + interval;

const limit = pLimit(3);
axiosRetry(axios, { retries: 1000, retryDelay: retryCount => retryCount * 500 });

(async () => {
    while (true) {
        await download();
        from += interval;
        to += interval;
    }
})();

async function download() {
    const tasks = [...Array(to - from).keys()].map(async it => {
        return limit(() => getMenuItem(it + from));
    });
    console.log(`getting from ${from} to ${to} ...`);
    const menu = await Promise.all(tasks);
    console.log('writting files...');
    await fs.writeFile(`menu_from_${from}_to_${to}.json`, JSON.stringify(menu), 'utf8');
    console.log(`complete from ${from} to ${to}!`);
}

async function getMenuItem(it) {
    const cookie = await fs.readFile('.cookie', 'utf8');
    console.log(`getting ${it} page...`)
    const url = `https://exhentai.org/?page=${it}`;
    const response = await axios.get(url, {
        headers: {
            Cookie: cookie
        },
    });
    const { document } = (new JSDOM(response.data)).window;
    return Array.from(document.querySelectorAll('.itg.glte>tbody>tr')).slice(1).map(doc => {
        return {
            id: doc.querySelector('.gl2e>div>a').href.trim().match(`\\d+`)[0],
            title: doc.querySelector('.gl4e.glname>.glink').textContent.trim(),
            type: doc.querySelector('.gl3e>div:first-of-type').textContent.trim(),
            time: doc.querySelector('.gl3e>div:nth-of-type(2)').textContent.trim(),
            link: doc.querySelector('.gl2e>div>a').href.trim(),
            img: doc.querySelector('.gl1e img').src.trim(),
            uploader: doc.querySelector('.gl3e>div:nth-of-type(4)').textContent.trim(),
            tags: Array.from(doc.querySelector('.gl4e.glname>div:last-of-type').querySelectorAll('tr')).map(tr => {
                return {
                    name: tr.querySelector('td:first-of-type').textContent.trim(),
                    values: Array.from(tr.querySelectorAll('td:last-of-type>div')).map(gt => gt.textContent.trim())
                }
            })
        };
    });
}
