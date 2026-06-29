// server.js - Heroku Entry Point
// Hii ina-run FastAPI kwa njia ya Node.js

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Port ya Heroku
const PORT = process.env.PORT || 8000;

// Logging
console.log(`🚀 Sovereign Grid starting on port ${PORT}`);
console.log(`📂 Current directory: ${__dirname}`);

// Angalia kama FastAPI ipo
const mainPy = path.join(__dirname, 'main.py');
if (!fs.existsSync(mainPy)) {
    console.error('❌ main.py not found! Creating default...');
    createDefaultMainPy();
}

// Anzisha FastAPI server
function startFastAPI() {
    console.log('🐍 Starting FastAPI server...');
    
    // Tumia uvicorn kuanzisha FastAPI
    const python = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', PORT]);
    
    // Handle stdout
    python.stdout.on('data', (data) => {
        console.log(`📡 ${data.toString().trim()}`);
    });
    
    // Handle stderr
    python.stderr.on('data', (data) => {
        console.error(`⚠️ ${data.toString().trim()}`);
    });
    
    // Handle exit
    python.on('close', (code) => {
        console.log(`🔴 FastAPI process exited with code ${code}`);
        if (code !== 0) {
            console.log('🔄 Restarting FastAPI...');
            setTimeout(startFastAPI, 1000);
        }
    });
    
    // Handle errors
    python.on('error', (err) => {
        console.error(`❌ Failed to start Python: ${err.message}`);
        console.log('🔄 Retrying...');
        setTimeout(startFastAPI, 2000);
    });
}

// Unda default main.py kama haipo
function createDefaultMainPy() {
    const content = `
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Sovereign Grid", version="31.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Sovereign Grid is running on Heroku!"}

@app.get("/health")
async def health():
    return {"status": "alive", "version": "31.0"}

@app.get("/ready")
async def ready():
    return {"status": "ready"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
`;
    
    fs.writeFileSync('main.py', content);
    console.log('✅ Created default main.py');
}

// Angalia kama Python ipo
function checkPython() {
    const python = spawn('python', ['--version']);
    python.on('close', (code) => {
        if (code !== 0) {
            console.error('❌ Python not found! Trying python3...');
            startWithPython3();
        } else {
            startFastAPI();
        }
    });
    python.on('error', () => {
        console.error('❌ Python not found! Trying python3...');
        startWithPython3();
    });
}

function startWithPython3() {
    const python = spawn('python3', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', PORT]);
    python.stdout.on('data', (data) => console.log(`📡 ${data}`));
    python.stderr.on('data', (data) => console.error(`⚠️ ${data}`));
    python.on('close', (code) => {
        if (code !== 0) setTimeout(startWithPython3, 1000);
    });
}

// Anzisha
console.log('🔍 Checking Python installation...');
checkPython();

// Handle process signals
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down...');
    process.exit(0);
});
