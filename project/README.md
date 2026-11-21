# CyberGPT – AI Cyber Security Learning Assistant

CyberGPT is a sleek, AI-powered cybersecurity learning platform built for undergraduate students. It features interactive learning modules, structured explanations powered by Groq API, dynamic assessments, password strength auditing, and visual progress tracking.

---

## Features

1.  **AI Cyber Security Assistant (`Ask AI`)**: Query CyberGPT (powered by Groq's `Llama-3.3-70B-Versatile`) on threats, concepts, and secure codings. Returns structured Definition, Example, Impact, and Prevention sections.
2.  **Vulnerability Modules (`Learn Attacks`)**: Explore structured threat pages for SQL Injection, XSS, CSRF, Password Security, Networking, and Blockchain exploits.
3.  **Dynamic Assessments (`Take Quiz`)**: Test knowledge with automated quiz questions generated on-demand by the AI model. Instantly validates answers and explains solutions.
4.  **Credential Auditor (`Password Analyzer`)**: Run entropy calculators, length tests, pattern matching, and dictionary checks locally and via the backend with visual scoring gauges and tips.
5.  **Grades Summary (`Progress Report`)**: View completed items, average test grades, identified weaknesses, and visualize scores over time on a glowing canvas bar chart.
6.  **Resilience Fallbacks**: If the Groq API key is invalid, rate-limited, or offline, CyberGPT automatically redirects requests to a custom offline database containing mock scenarios and explanations to prevent server failures.

---

## Tech Stack

*   **Frontend**: HTML5, Vanilla CSS3 (Custom animations, glassmorphism, responsive cyber layouts), Vanilla JavaScript (ES6 Fetch, Canvas charts)
*   **Backend**: Python Flask, Flask Blueprints
*   **Database**: SQLite
*   **AI Engine**: Groq API (`Llama-3.3-70B-Versatile`)

---

## Structure

```
project/
│
├── instance/                 # SQLite database storage (auto-created)
│   └── database.db
│
├── static/                   # Static assets
│   ├── css/
│   │   └── style.css         # Custom responsive theme CSS
│   └── js/
│       └── app.js            # Single Page App framework and state
│
├── templates/                # HTML Templates
│   └── index.html            # Main SPA dashboard template
│
├── blueprints/               # Modular Flask routing
│   ├── __init__.py
│   ├── auth.py               # /auth (login, register, session)
│   ├── ai.py                 # /ai (ask-ai, quiz)
│   └── tools.py              # /tools (password checks, progress)
│
├── .env                      # Configuration parameters & Groq Key
├── app.py                    # Main server entrypoint
├── database.py               # SQLite connection setup and table schemas
└── requirements.txt          # Python dependencies
```

---

## Getting Started (Setup & Run)

### Prerequisites
Make sure you have **Python 3.8+** installed.

### 1. Set Up a Virtual Environment (Recommended)
Navigate to the project root directory and create a virtual environment:
```powershell
python -m venv venv
```

Activate the virtual environment:
*   **Windows (PowerShell)**:
    ```powershell
    .\venv\Scripts\Activate.ps1
    ```
*   **Windows (Command Prompt)**:
    ```cmd
    .\venv\Scripts\activate.bat
    ```
*   **Linux / macOS**:
    ```bash
    source venv/bin/activate
    ```

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Check Configurations
The `.env` file is pre-configured with Flask settings and your custom **Groq API Key**. You can open it to verify:
```env
GROQ_API_KEY=gsk_ctq2HDPzz6r4QSZrEIEx...
SECRET_KEY=cyber_security_learning_assistant_secret_key
```

### 4. Start the Application
Run the Flask server:
```bash
python app.py
```

Upon startup, the database structure (`instance/database.db`) will be automatically initialized.

### 5. Access the Web UI
Open your web browser and navigate to:
```
http://127.0.0.1:5000
```
Register a new profile or log in with your email to start exploring.
