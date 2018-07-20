const path = require('path');
const crypto = require('crypto');

const initPuppeteerPool = require('./pool');
const pool = initPuppeteerPool({
    puppeteerArgs: {
        userDataDir: path.join(process.cwd(), 'tmp'),
        ignoreHTTPSErrors: true,
        headless: true,
        slowMo: 0,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--proxy-server="direct://"',
            '--proxy-bypass-list=*',
            '--mute-audio',
            '--hide-scrollbars'
        ]
    }
});

module.exports = async ({ url, linkBase }) => {
    return new Promise((result, reject) => {
        pool.use(async browser => {
            var page = await browser.newPage();

            await page.setDefaultNavigationTimeout(10000);
            await page._client.send('Page.setDownloadBehavior', { behavior: 'deny' });
            await page._client.send('Page.setAdBlockingEnabled', { enabled: true });
            await page.emulateMedia('screen');
            await page.setViewport({ width: 1280, height: 720 });

            page.on('dialog', async dialog => await dialog.dismiss());

            page.on('error', () => {
                page.close();
                return result({ pdfDestination: null });
            });

            try {
                await page.goto(url, {
                    waitUntil: 'domcontentloaded'
                });

                await page.evaluate(async ({ linkBase }) => {
                    await new Promise(resolve => {
                        var links = document.querySelectorAll('a[href]');

                        for (let i = 0; i < links.length; i++) {
                            try {
                                if (/magnet:\?xt=urn:[a-z0-9]+:[a-zA-Z0-9]*/.test(links[i].href)) {
                                    links[i].href = `${linkBase}?url=${btoa(links[i].href)}`;

                                } else {
                                    links[i].href = `${linkBase}?url=${btoa(new URL(links[i].href, location.href).href)}`;
                                }

                            } catch (e) {
                                continue;
                            }
                        }

                        return resolve(true);
                    });

                }, { linkBase });

                var output = path.join(process.cwd(), 'tmp', crypto.randomBytes(20).toString('hex') + '.pdf');

                await page.pdf({
                    path: output,
                    format: 'A4',
                    printBackground: true
                });

                page.close();
                return result({ pdfDestination: output });

            } catch (e) {
                console.log(e);
                page.close();
                return result({ pdfDestination: null });
            }
        });
    });
};
