const path = require('path');
const crypto = require('crypto');

const initPuppeteerPool = require('./pool');
const pool = initPuppeteerPool({
    puppeteerArgs: {
        userDataDir: path.join(process.cwd(), 'tmp'),
        ignoreHTTPSErrors: true,
        headless: false,
        executablePath: process.env.GOOGLE_CHROME_SHIM,
        args: [
            '--proxy-server="direct://"',
            '--proxy-bypass-list=*'
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
                                links[i].href = `${linkBase}?url=${new URL(links[i].href, location.href).href}`;

                            } catch (err) {
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

            } catch (err) {
                console.log(err);
                page.close();
                return result({ pdfDestination: null });
            }
        });
    });
};
