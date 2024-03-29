const path = require("path");
const crypto = require("crypto");

const initPuppeteerPool = require("./pool");
const pool = initPuppeteerPool(
    {
        puppeteerArgs: {
            userDataDir: path.join(process.cwd(), "tmp"),
            ignoreHTTPSErrors: true,
            headless: true,
            slowMo: 0,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                '--proxy-server="direct://"',
                "--proxy-bypass-list=*"
            ]
        }
    }
);

module.exports = ({ url, linkBase }) => {
    return new Promise(
        resolve => {
            pool.use(
                async browser => {
                    const page = await browser.newPage();

                    await page.setDefaultNavigationTimeout(10000);
                    await page._client.send("Page.setDownloadBehavior", { behavior: "deny" });
                    await page._client.send("Page.setAdBlockingEnabled", { enabled: true });
                    await page.emulateMedia("screen");
                    await page.setViewport({ width: 1280, height: 720 });

                    page.on("dialog", async dialog => await dialog.dismiss());
                    page.on("error",
                        () => {
                            page.close();
                            return resolve(null);
                        }
                    );

                    try {
                        await page.goto(url, { waitUntil: "networkidle2" });
                        await page.evaluate(`
                            new Promise(resolve => {
                                let links = document.querySelectorAll('a[href]');

                                for (let i = 0; i < links.length; i++) {
                                    try {
                                        if (/magnet:\?xt=urn:[a-z0-9]+:[a-zA-Z0-9]*/.test(links[i].href)) {
                                            links[i].href = "${linkBase}/" + btoa(links[i].href);

                                        } else {
                                            links[i].href = "${linkBase}/" + btoa(new URL(links[i].href, location.href).href);
                                        }

                                    } catch (e) {
                                        continue;
                                    }
                                }

                                return resolve(true);
                            });
                        `);

                        let output = path.join(
                            process.cwd(),
                            "tmp",
                            `${crypto.randomBytes(20).toString("hex")}.pdf`
                        );

                        await page.pdf(
                            {
                                path: output,
                                format: "A4",
                                printBackground: true
                            }
                        );

                        page.close();
                        return resolve(output);
                    }
                    catch (e) {
                        console.log(e);
                        page.close();
                        return resolve(null);
                    }
                });
        });
};
