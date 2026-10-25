# CheckMyTOC / ClauseWise Chrome Extension

This is an unpacked Chrome Extension (Manifest V3) adapted from the ClauseWise UI and connected to the existing local CheckMyTOC API.

## Requirements
- Google Chrome or Chromium
- Existing Express/Gemma backend running at `http://localhost:3000`

## Install
1. Start your backend from the main project folder: `node backend/server.js`
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder (the folder containing `manifest.json`).
5. Open a normal website with terms, click the extension, then **Read current page** and **Analyze terms**.

## Notes
- The extension sends the text you choose to analyze to your local backend. Do not analyze sensitive information unless you are comfortable sending it to the configured model provider.
- Chrome blocks extraction from protected pages such as `chrome://` pages and the Chrome Web Store. You can paste terms manually instead.
- The score is an illustrative screening heuristic, not legal advice.
- The API key remains in your backend `.env`; it must not be added to this extension.
