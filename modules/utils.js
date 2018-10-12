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

    streamFile({ writableStream, file }) {
        if (typeof file === 'object' && typeof file.pipe === 'function') {
            return file.once('end', () => {
                file.destroy();
                fs.unlink(file, err => {});
            }).pipe(writableStream);

        } else if (typeof file === 'string') {
            return request({
                method: 'GET',
                uri: file,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3563.0 Safari/537.36'
                }
            }).pipe(writableStream);
        }
    },

    uploadFile(file) {
        return new Promise(resolve => {
                request({
                    method: 'POST',
                    uri: 'https://rokket.space/upload',
                    formData: {
                        'files[]': fs.createReadStream(file)
                    }
                },
                (err, httpResponse, body) => {
                    if (err || String(httpResponse.statusCode).match(/^(4|5)\d{2}$/)) {
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
