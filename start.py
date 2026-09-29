import subprocess
import time
import os

def start_servers():
    print("Starting FastAPI Backend...")
    # Open a new command prompt window and run the backend commands
    subprocess.Popen('start cmd /k "cd backend && .\\venv\\Scripts\\activate && uvicorn main:app --reload"', shell=True)

    # Small delay to ensure backend starts gracefully before frontend
    time.sleep(2)

    print("Starting Vite/React Frontend...")
    # Open a new command prompt window and run the frontend commands
    subprocess.Popen('start cmd /k "cd frontend && npm run dev"', shell=True)

    print("Both servers have been launched in separate windows!")

if __name__ == "__main__":
    start_servers()
