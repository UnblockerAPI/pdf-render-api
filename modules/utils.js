const fs = require('fs');
const request = require('request');


module.exports = {
    checkAvailability(url) {
        return new Promise(resolve => {
            request({
                method: 'HEAD',
                uri: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3563.0 Safari/537.36'
                }
            },
            (err, httpResponse, body) => {
                if (err || String(httpResponse.statusCode).match(/^(4|5)\d{2}$/)) {
                    return resolve({ isOk: false, headers: null });
                }

                return resolve({ isOk: true, headers: httpResponse.headers });
            });
        });
    },
    upload({ file }) {
        return new Promise(resolve => {
                request({
                    method: 'POST',
                    uri: 'https://rokket.space/upload',
                    formData: {
                        'files[]': fs.createReadStream(file)
                    }
                },
                (err, httpResponse, body) => {
                    if (err || httpResponse.statusCode !== 200) {
                        return resolve({
                            failed: true,
                            uploadResult: {
                                success: false
                            }
                        });
                    }

                    return resolve({
                        failed: false,
                        uploadResult: JSON.parse(body)
                    });
                });
        });
    }
};
