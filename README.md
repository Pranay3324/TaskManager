## Full-Stack AI-Powered Task Manager (MERN Stack)

### 🚀 Overview

This application is a modern, secure, and scalable To-Do List and productivity manager. It is built as a Single Page Application (SPA) using the MERN stack and features unique integration with the **Google Gemini API** to enhance user planning and task breakdown.

The app uses **JWT authentication** for secure user sessions and relies on a **stateless architecture** for high performance.

### ✨ Key Features & Technical Highlights

* **AI Subtask Generation:** Users can input complex tasks (e.g., "Plan a marketing campaign"), and the application uses the **Gemini API** to generate a list of actionable sub-tasks instantly.
* **Secure Authentication:** Implemented user registration and login using **JWT (JSON Web Tokens)**, with all passwords secured via **bcryptjs** hashing.
* **Authorization Control:** Middleware ensures that users can only fetch, modify, or delete their own tasks.
* **Advanced UX:** Features **in-place editing** directly within the task item and a custom-animated **"strike-through" effect** upon task completion for satisfying visual feedback.
* **Productivity Tools:** Includes an integrated **Pomodoro Timer** and an **Analytics Dashboard** for tracking completion rates.
* **Architecture:** Built on a **Stateless RESTful API** architecture, ensuring easy scalability.

---

### 💻 Technology Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend (Client)** | **React.js** | Component architecture, state management, routing. |
| **Styling** | **Tailwind CSS** | Utility-first CSS for responsive design and Dark Mode theme toggling. |
| **Backend (Server)** | **Node.js / Express.js** | RESTful API creation and routing. |
| **Database** | **MongoDB (Mongoose)** | Permanent data storage for users and tasks. |
| **Security** | **JWT, bcryptjs** | Token generation, validation, and password hashing. |
| **AI Integration** | **Gemini API** | Generative AI service for creating task breakdowns. |

---

### ⚙️ Setup and Installation

Follow these steps to get the application running locally:

#### 1. Backend Setup

1.  Navigate to the `backend/` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Configuration:** Create a file named `.env` in the `backend/` root directory and fill in your confidential variables:
    ```dotenv
    MONGODB_URI=mongodb+srv://<Your_Cluster_URL>/todoapp
    JWT_SECRET=<YOUR_LONG_RANDOM_SECRET_KEY>
    GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
    PORT=5000
    ```
4.  Start the server:
    ```bash
    nodemon server.js  # or npm start
    ```

#### 2. Frontend Setup

1.  Navigate to the `client/` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **API Configuration:** Ensure the `API_BASE_URL` in `src/App.jsx` is updated if testing against a deployed backend, or keep it as `http://localhost:5000` for local testing.
4.  Start the client:
    ```bash
    npm run dev
    ```

---

### 🛠️ Troubleshooting & Deployment

| Issue | Resolution |
| :--- | :--- |
| **404 Not Found** | Ensure the correct base URL is used in `App.jsx` and that all fetch calls use the correct `/api/` prefix. |
| **401 Unauthorized** | Verify the `JWT_SECRET` is set correctly in the backend's environment variables, and that the client is sending a valid, unexpired token. |
| **CORS Block** | Ensure the backend's `server.js` CORS middleware is explicitly configured to allow requests from the deployed frontend URL (e.g., `https://fullstack-taskmanager-1.onrender.com`). |
