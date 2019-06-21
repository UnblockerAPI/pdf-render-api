const fs = require("fs");
const request = require("request");

const fileHosts = require("./filehosts");

module.exports = {
    checkAvailability(url) {
        return new Promise(resolve => {
            let r = request(
                {
                    method: "GET",
                    uri: url,
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3563.0 Safari/537.36"
                    }
                }
            );

            r.on("response",
                response => {
                    r.abort();

                    if (String(response.statusCode).match(/^(4|5)\d{2}$/)) {
                        return resolve({ isOk: false, headers: null });
                    }

                    return resolve({ isOk: true, headers: response.headers });
                }
            );

            r.on("error",
                err => {
                    r.abort();
                    return resolve({ isOk: false, headers: null });
                }
            );
        });
    },

    streamFile({ writableStream, file }) {
        if (typeof file === "object" && typeof file.pipe === "function") {
            return file.once("end",
                () => {
                    file.destroy();
                    fs.unlink(file.path, err => { });
                }
            ).pipe(writableStream);
        } else if (typeof file === "string") {
            return request(
                {
                    method: "GET",
                    uri: file,
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3563.0 Safari/537.36"
                    }
                }
            ).on("response",
                response => {
                    delete response.headers["content-disposition"];
                    delete response.headers["content-type"];
                }
            ).pipe(writableStream);
        }
    },

    uploadFile(filePath) {
        return new Promise(
            async resolve => {
                let uploadResult = null;

                for (let fileHost of Object.values(fileHosts)) {
                    uploadResult = await fileHost.upload(filePath);
                    if (uploadResult.success) break;
                }

                return resolve(uploadResult);
            }
        );
    }
};
