const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');


let isProduction = process.env.NODE_ENV === 'production';
let PORT = isProduction ? '/tmp/nginx.socket' : 8080;
let linkBase = isProduction ? 'https://unblocker.now.sh' : `http://127.0.0.1:${PORT}`;
let callbackFn = () => {
    if (isProduction) {
        fs.closeSync(fs.openSync('/tmp/app-initialized', 'w'));
    }

    console.log(`Listening on ${PORT}`);
};


const RENDER_CACHE = require('./modules/cacheEngine')(isProduction);
const render = require('./modules/render');
const utils = require('./modules/utils');


const app = express();
app.enable("trust proxy", 1);
app.use(helmet());
app.use(compression());

app.get('/', async (req, res) => {
    try {
        let targetUrl = new URL(Buffer.from(req.query.url, 'base64').toString('ascii'));
        let shouldDisplay = /^true$/.test(req.query.display);
        let shouldForceRender = /^true$/.test(req.query.force);

        let keyExists = await RENDER_CACHE.hasKey(targetUrl.href);

        if (!shouldForceRender && keyExists) {
            let { entryStillValid, entry } = await new Promise(async resolve => {
                let entry = await RENDER_CACHE.getKey(targetUrl.href);

                let { isOk } = await utils.checkAvailability({ url: entry });

                if (!isOk) {
                    RENDER_CACHE.deleteKey(targetUrl.href);
                    return resolve({ entryStillValid: false, entry: null });
                }

                return resolve({ entryStillValid: true, entry: entry });
            });

            if (entryStillValid) {
                if (shouldDisplay) {
                    return res.redirect(`/view?pdf=${entry}`);
                }

                return res.status(200).json({ success: true, pdfLocation: entry, fromCache: true });
            }

        } else if (shouldForceRender && keyExists) {
            RENDER_CACHE.deleteKey(targetUrl.href);
        }

        let { isOk, headers } = await utils.checkAvailability({ url: targetUrl.href });

        if (!isOk) {
            return res.status(400).json({ success: false, reason: "Non200StatusCode" });
        }

        let contentTypeHeaderExists = headers.hasOwnProperty('content-type');

        if (contentTypeHeaderExists) {
            let contentType = headers["content-type"];

            if (!contentType.includes("text/html")) {
                return res.status(400).json({ success: false, reason: "NothingToRender" });
            }

            let { pdfDestination } = await render({ url: targetUrl.href, linkBase: linkBase });

            if (pdfDestination) {
                let { failed, uploadResult } = await utils.uploadPdf({ file: pdfDestination });

                if (!failed && uploadResult.success) {
                    fs.unlinkSync(pdfDestination);

                    let uploadUrl = uploadResult.files[0].url;
                    RENDER_CACHE.setKey(targetUrl.href, uploadUrl);

                    if (shouldDisplay) {
                        return res.redirect(`/view?pdf=${uploadUrl}`);
                    }

                    return res.status(200).json({ success: true, pdfLocation: uploadUrl, fromCache: false });

                } else {
                    fs.unlinkSync(pdfDestination);
                    return res.status(503).json({ success: false, reason: "UploadFailed" });
                }

            } else {
                return res.status(500).json({ success: false, reason: "PageLoadFailed" });
            }

        } else {
            return res.status(400).json({ success: false, reason: "NoValidHeaders" });
        }

    } catch (e) {
        return res.status(400).json({ success: false, reason: "InvalidURL" });
    }
});

app.get('/view', (req, res) => {
    if (req.query.pdf) {
        return res.sendFile(path.join(process.cwd(), 'templates', 'view.html'));
    }

    return res.status(400).end();
});


app.listen(PORT, callbackFn);
