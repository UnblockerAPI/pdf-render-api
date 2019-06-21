const fs = require("fs");
const request = require("request");

module.exports = class RokketSpace {
    static upload(file) {
        return new Promise(
            resolve => {
                request(
                    {
                        method: "POST",
                        uri: "https://rokket.space/api/upload",
                        headers: {
                            "token": process.env.ROKKET_API_TOKEN
                        },
                        formData: {
                            "files[]": fs.createReadStream(file)
                        },
                        timeout: 5000
                    },
                    (err, httpResponse, body) => {
                        if (!err && !String(httpResponse.statusCode).match(/^(4|5)\d{2}$/)) {
                            let tempRes = JSON.parse(body);
                            return resolve({
                                success: tempRes.success,
                                url: tempRes.files[0].url,
                                ttl: 60 * 60 * 24 * 2
                            });
                        }

                        return resolve({ success: false });
                    }
                );
            }
        );
    }
};
