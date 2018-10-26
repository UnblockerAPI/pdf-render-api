const fs = require('fs');
const request = require('request');

module.exports =
    class RokketSpace {
        constructor() {
            this.uploadResult = {
                success: false
            };
        }

        static get fileHostName() { return 'RokketSpace'; }
        get fileHostName() { return 'RokketSpace'; }

        static get fileTTL() { return 60 * 60 * 24 * 2; }
        get fileTTL() { return 60 * 60 * 24 * 2; }

        upload(file) {
            return new Promise(resolve => {
                request({
                    method: 'POST',
                    uri: 'https://rokket.space/upload',
                    formData: {
                        'files[]': fs.createReadStream(file)
                    }
                },
                (err, httpResponse, body) => {
                    if (!err && !String(httpResponse.statusCode).match(/^(4|5)\d{2}$/)) {
                        let tempRes = JSON.parse(body);

                        this.uploadResult = {
                            success: tempRes.success,
                            url: tempRes.files[0].url,
                            ttl: this.fileTTL
                        };
                    }

                    return resolve(this.uploadResult);
                });
            });
        }
    };
