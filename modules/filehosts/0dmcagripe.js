const fs = require("fs");
const request = require("request");

module.exports = class DmcaGripe {
  constructor() {
    this.uploadResult = {
      success: false
    };
  }

  static get fileHostName() {
    return "DmcaGripe";
  }
  get fileHostName() {
    return "DmcaGripe";
  }

  static get fileTTL() {
    return 60 * 60 * 24 * 14;
  }
  get fileTTL() {
    return 60 * 60 * 24 * 14;
  }

  upload(file) {
    return new Promise(resolve => {
      request(
        {
          method: "POST",
          uri: "https://dmca.gripe/api/upload",
          formData: {
            "files[]": fs.createReadStream(file)
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
        }
      );
    });
  }
};
