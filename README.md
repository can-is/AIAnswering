# 🤖 ChatGPT Meetings

A real-time, ChatGPT-style meeting and viewer system powered by **Node.js**, **Socket.io**, and **Markdown rendering**.  
The app allows an admin to create or join meeting rooms, send AI-powered prompts, and broadcast formatted responses to viewers — all in a sleek ChatGPT-inspired interface.

---

## 🚀 Features

✅ **Real-Time Messaging** — powered by Socket.io for instant updates  
✅ **ChatGPT-Style Interface** — bubble layout with avatars for user and AI  
✅ **Markdown Rendering** — supports headers, bold text, lists, and syntax-highlighted code blocks  
✅ **Speech Input (🎙️)** — microphone support for quick prompts  
✅ **Viewer Mode** — read-only chat view showing AI responses live  
✅ **Responsive UI** — mobile, tablet, and desktop friendly  
✅ **Secure Login** — basic token-based access for admin users  
✅ **Dark Mode Aesthetic** — inspired by GitHub & ChatGPT themes

---

## 🧠 Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | HTML5, CSS3 (custom), JavaScript (ES Modules) |
| Real-Time Engine | [Socket.io](https://socket.io) |
| Markdown Rendering | [Marked.js](https://github.com/markedjs/marked) |
| Syntax Highlighting | [Highlight.js](https://highlightjs.org/) |
| Backend (suggested) | Node.js + Express |
| Auth | Token-based via LocalStorage (for admin) |

---

## 📂 Folder Structure
chatgpt-meetings/
├── public/
│ ├── index.html # Admin Panel
│ ├── viewer.html # Viewer Interface
│ ├── login.html # Simple login page
│ ├── styles.css # Common UI styling
│ ├── asker.js # Admin logic (sending messages)
│ ├── viewer.js # Viewer logic (receiving messages)
│ ├── shared.js # Shared Markdown + render utilities
│ └── favicon.ico
├── server.js # Express + Socket.IO backend
├── package.json
└── README.md


---

## 🧩 Installation

### 1️⃣ Clone the repository
```bash
git clone https://github.com/can-is/AIAnswering.git
cd AIAnswering

2️⃣ Install dependencies
npm install

3️⃣ Run the server
node server.js


Server will start on http://localhost:3000

💻 Usage
🧑‍💼 Admin Panel (index.html)

Create new meetings

Send prompts via text or voice (🎙️ button)

Toggle “Send to Viewer” switch to broadcast messages

👀 Viewer Panel (viewer.html)

Join a meeting with Meeting ID + Password

Watch AI responses update in real time

🧠 Example Conversation
**User:** What is Azure Function vs Durable Function?

**AI:**  
- Azure Function: Stateless, short-lived tasks  
- Durable Function: Stateful, long-running workflows  
Ideal for scenarios needing orchestration or multi-step coordination.

📱 Responsive Design

On mobile, sidebar collapses into a hamburger menu

Messages auto-scroll and reflow for smaller screens

Full-height, scrollable chat with pinned footer

🔐 Authentication

On login, an idToken is stored in localStorage

If absent, users are redirected to /login.html

🖤 Credits

Socket.IO

Marked.js

Highlight.js

Google SpeechRecognition API

📄 License

This project is released under the MIT License.
Feel free to fork, improve, and build your own real-time AI chat systems.

🌟 Future Enhancements

✅ Meeting transcripts auto-save to database

✅ Multi-user chatrooms with roles

🚧 AI-powered meeting summaries

🚧 Voice response playback

🚧 OAuth / Firebase login

✨ Made with ❤️ by Creayaa Tech