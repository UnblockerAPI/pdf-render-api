# pdf-render-api
> Part of Unblocker project

Website rendering API

### `GET`:
* `/?url=<String>` - where `url` is **Base64** encoded url. Returns `{ success: Boolean, pdfLocation: String, fromCache: Boolean }`
* `...&display=<Boolean>` - returns HTML, which embeds PDF from `pdfLocation` into the page
