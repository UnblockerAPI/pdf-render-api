const fs = require("fs");
const path = require("path");
const request = require("request");

module.exports = class TransferSh {
  constructor() {
    this.uploadResult = {
      success: false
    };
  }

  static get fileHostName() {
    return "TransferSh";
  }
  get fileHostName() {
    return "TransferSh";
  }

  static get fileTTL() {
    return 60 * 60 * 24 * 14;
  }
  get fileTTL() {
    return 60 * 60 * 24 * 14;
  }

  upload(file) {
    return new Promise(resolve => {
      fs.createReadStream(file).pipe(
        request(
          {
            method: "PUT",
            uri: `https://transfer.sh/${path.basename(file)}`
          },
          (err, httpResponse, body) => {
            if (
              !err &&
              !String(httpResponse.statusCode).match(/^(4|5)\d{2}$/)
            ) {
              this.uploadResult = {
                success: true,
                url: body,
                ttl: this.fileTTL
              };
            }

            return resolve(this.uploadResult);
          }
        )
      );
    });
  }
};
