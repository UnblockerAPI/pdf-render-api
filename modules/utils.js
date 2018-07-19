const fs = require('fs');
const request = require('request');


module.exports = {
    checkAvailability({ url }) {
        return new Promise(resolve => {
            request({
                method: 'HEAD',
                uri: url
            },
            (err, httpResponse, body) => {
                if (err || httpResponse.statusCode !== 200) {
                    return resolve({ isOk: false, headers: null });
                }

                return resolve({ isOk: true, headers: httpResponse.headers });
            });
        });
    },
    uploadPdf({ file }) {
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
