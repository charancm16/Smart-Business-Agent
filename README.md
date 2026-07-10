# 🤖 Smart Business Agent — IBM watsonx

A production-ready AI-powered business advisor chatbot built with **IBM watsonx AI (Granite-4)**, Node.js/Express backend, and a dark-themed chat UI.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open in browser
```
http://localhost:3000
```

---

## 📁 Project Structure

```
smart-business-agent/
├── server.js          # Express backend + IBM watsonx integration
├── package.json       # Node.js dependencies
├── public/
│   └── index.html     # Full chat UI (single file, no build needed)
└── README.md
```

---

## 🔧 Configuration

The API credentials are embedded in `server.js` with environment variable overrides. To use env vars:

```bash
IBM_API_KEY=your_key
IBM_PROJECT_ID=your_project_id
IBM_MODEL_ID=ibm/granite-4-h-small
IBM_ENDPOINT=https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29
PORT=3000
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **AI Model** | IBM watsonx Granite-4-h-small |
| **IAM Auth** | Auto-fetches & caches IBM IAM tokens |
| **Focus Modes** | General, Strategy, Finance, Sales, Operations, HR |
| **Markdown Rendering** | Bold, lists, code blocks, headers |
| **Rate Limiting** | 30 req/min per IP |
| **Conversation Memory** | Full chat history sent per request |
| **Typing Indicator** | Animated dots while AI responds |
| **Suggestion Chips** | One-click starter prompts |
| **Responsive** | Works on mobile and desktop |

---

## 🌐 API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Send messages to the AI |
| `GET` | `/api/suggestions` | Get starter prompt suggestions |
| `GET` | `/api/health` | Health check |

### Chat Request Body
```json
{
  "messages": [{"role": "user", "content": "Hello"}],
  "mode": "general"
}
```

### Available Modes
- `general` — General business advice
- `strategy` — Strategic planning focus
- `finance` — Financial analysis focus
- `sales` — Sales & marketing focus
- `operations` — Operations focus
- `hr` — HR & people focus

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express, Axios
- **AI**: IBM watsonx AI — `ibm/granite-4-h-small`
- **Auth**: IBM IAM token with auto-refresh caching
- **Security**: Helmet, CORS, express-rate-limit
- **Frontend**: Vanilla HTML/CSS/JS (zero dependencies)
