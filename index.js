const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const fs = require("fs");

let isProduction = process.env.NODE_ENV === "production";
let PORT = isProduction ? "/tmp/nginx.socket" : 8080;
let linkBase = isProduction
    ? "https://unblocker.vercel.app"
    : `http://127.0.0.1:${PORT}`;
let callbackFn = () => {
    if (isProduction) {
        fs.closeSync(fs.openSync("/tmp/app-initialized", "w"));
    }

    console.log(`Listening on ${PORT}`);
};

const RENDER_CACHE = require("./modules/cacheEngine")(isProduction);
const render = require("./modules/render");
const utils = require("./modules/utils");

const app = express();
app.enable("trust proxy", 1);
app.use(helmet());
app.use(compression());

app.get("/", async (req, res) => {
    try {
        let targetUrl = new URL(
            Buffer.from(req.query.url, "base64").toString("ascii")
        );

        let shouldDisplay = /^true$/.test(req.query.display);
        let shouldForceRender = /^true$/.test(req.query.force);
        let keyExists = await RENDER_CACHE.hasKey(targetUrl.href);

        if (keyExists) {
            if (shouldForceRender) {
                RENDER_CACHE.deleteKey(targetUrl.href);
            }
            else {
                let { entryStillValid, entry } = await new Promise(
                    async resolve => {
                        let entry = await RENDER_CACHE.getKey(targetUrl.href);

                        let { isOk } = await utils.checkAvailability(entry);

                        if (!isOk) {
                            RENDER_CACHE.deleteKey(targetUrl.href);
                            return resolve({ entryStillValid: false, entry: null });
                        }

                        return resolve({ entryStillValid: true, entry: entry });
                    }
                );

                if (entryStillValid) {
                    if (!shouldDisplay) {
                        return res.status(200).json({ success: true, pdfLocation: entry, fromCache: true });
                    }

                    res.status(200).set(
                        {
                            "Content-Type": "application/pdf",
                            "Content-Disposition": 'inline; filename="render.pdf"'
                        }
                    );

                    return utils.streamFile(
                        {
                            writableStream: res,
                            file: entry
                        }
                    );
                }
            }
        }

        let { isOk, headers } = await utils.checkAvailability(targetUrl.href);
        if (!isOk) {
            return res.status(400).json({ success: false, reason: "Non200StatusCode" });
        }

        let contentTypeHeaderExists = headers.hasOwnProperty("content-type");
        if (!contentTypeHeaderExists) {
            return res.status(400).json({ success: false, reason: "NoValidHeaders" });
        }

        let contentType = headers["content-type"];
        if (!contentType.includes("text/html")) {
            return res.status(400).json({ success: false, reason: "NothingToRender" });
        }

        let pdfDestination = await render(
            {
                url: targetUrl.href,
                linkBase: linkBase
            }
        );

        if (!pdfDestination) {
            return res.status(500).json({ success: false, reason: "PageLoadFailed" });
        }

        let uploadResult = await utils.uploadFile(pdfDestination);

        if (!uploadResult || !uploadResult.success) {
            if (!shouldDisplay) {
                return res.status(503).json({ success: false, reason: "UploadFailed" });
            }
        }
        else {
            RENDER_CACHE.setKey(targetUrl.href, uploadResult.url, uploadResult.ttl);
            if (!shouldDisplay) {
                return res.status(200).json({ success: true, pdfLocation: uploadResult.url, fromCache: false });
            }
        }

        res.status(200).set(
            {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'inline; filename="render.pdf"'
            }
        );

        return utils.streamFile(
            {
                writableStream: res,
                file: fs.createReadStream(pdfDestination)
            }
        );
    }
    catch (e) {
        if (e instanceof TypeError) {
            return res.status(400).json({ success: false, reason: "InvalidURL" });
        }

        console.log(e);
        return res.status(500).json({ success: false, reason: "EpicFail" });
    }
});

app.listen(PORT, callbackFn);
