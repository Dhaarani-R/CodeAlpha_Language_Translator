# AlphaTranslate - Universal Language & Voice Translator (CodeAlpha Task 1)

A premium, fully responsive, and feature-rich **Language Translation Web Application** built using clean Vanilla HTML, CSS, and JavaScript. 

This project was built as part of the **CodeAlpha Internship program (Domain: Web Development, Task 1)**.

🌐 **Live Demo:** [Click here to try the translator live!](https://dhaarani-r.github.io/CodeAlpha_Language_Translator/) *(Replace with actual deployed link)*

---

## ✨ Features

- 🔄 **Real-Time Translation**: Automatically translates text 800ms after you stop typing (debounced) or when clicking the "Translate Now" button.
- 📡 **Google Translate Integration**: Uses Google's free translation endpoint for high-quality neural machine translations across all supported languages (no API key required).
- 📜 **Translation History (Unique Feature)**: Saves your recent translations to a list at the bottom of the page using `localStorage`. You can copy past translations, reload them back into the main translator with one click, or delete individual entries.
- 🎙️ **Voice Typing (Speech-to-Text)**: Speak into your microphone to type text automatically using the browser-native **Speech Recognition API**.
- 🔊 **Listen aloud (Text-to-Speech)**: Hear the pronunciation of both your original text and the translated output using the browser-native **Speech Synthesis API**. Now includes support for languages like **Tamil**!
- 🌓 **Persistent Theme Toggle**: Switch seamlessly between a modern Glassmorphism Dark mode and a high-contrast Light mode. Your choice is saved locally and remembered next time you visit.
- 📋 **One-Click Copy**: Copy translated results to your clipboard with immediate hover-tooltip confirmation.
- 📱 **Fully Responsive Layout**: Built with a CSS Grid/Flexbox design that collapses beautifully on mobile screens.

---

## 🛠️ Technologies Used

- **HTML5**: Structured semantic markup.
- **CSS3 (Vanilla)**: Styling with custom variables, layout grids, backdrop-filter blur (glassmorphism), transitions, and media queries.
- **JavaScript (ES6+)**: Handles UI interactions, DOM manipulation, asynchronous `fetch` requests, browser voice APIs, and `localStorage`.
- **FontAwesome V6**: Premium icons.
- **Google Fonts**: Modern typography (Outfit font).

---

## 🚀 How to Run Locally

This app includes a lightweight Python proxy server (`server.py`) that serves the frontend files and proxies translation requests to Google Translate. This is needed because browsers block direct API calls to external servers due to CORS security rules.

### Requirements
- **Python 3** (no additional packages needed — uses only built-in modules)

### Steps
1. Open a terminal (PowerShell, Command Prompt, or terminal on Mac/Linux) in this project folder.
2. Run the server:
   ```bash
   python server.py
   ```
3. Open your browser and navigate to: **`http://localhost:8000`**
4. To stop the server, press `Ctrl+C` in the terminal.

---

## 🌍 Deploying to GitHub Pages (Free Hosting)

To deploy this project to the web so anyone can visit it:
1. Push this folder to your public GitHub repository named **`CodeAlpha_Language_Translator`**.
2. Go to the **Settings** tab of your repository on GitHub.
3. In the left menu, click **Pages**.
4. Under **Build and deployment**, set the Branch source to `main` (or `master`) and click **Save**.
5. After 1–2 minutes, refresh the page. GitHub will provide a link at the top (e.g., `https://username.github.io/CodeAlpha_Language_Translator/](https://dhaarani-r.github.io/CodeAlpha_Language_Translator/`). Add this link to your repository description and LinkedIn video!
