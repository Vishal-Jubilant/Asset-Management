import os
import sys
import time
import subprocess
import socket
import urllib.parse
import re

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def get_db_url():
    try:
        with open(os.path.join("backend", "database.py"), "r") as f:
            content = f.read()
        match = re.search(r'SQLALCHEMY_DATABASE_URL\s*=\s*["\']([^"\']+)["\']', content)
        if match:
            return match.group(1)
    except Exception:
        pass
    return None

def main():
    # STEP 1: Virtual Environment Check & Activation
    venv_path = os.path.join("backend", "venv")
    python_exe = os.path.join(venv_path, "Scripts", "python.exe") if os.name == "nt" else os.path.join(venv_path, "bin", "python")

    # If we are not running inside the venv, re-launch the script using the venv's python
    if sys.executable != os.path.abspath(python_exe):
        if not os.path.exists(python_exe):
            print("=" * 40)
            print("       CLIENT MANAGEMENT SYSTEM")
            print("=" * 40)
            print("\nSTEP 1: Checking Virtual Environment...")
            print("ERROR: Python virtual environment not found in backend/venv.")
            sys.exit(1)
        try:
            sys.exit(subprocess.call([python_exe, __file__] + sys.argv[1:]))
        except KeyboardInterrupt:
            sys.exit(0)

    # Now we are guaranteed to be running inside the venv
    print("=" * 40)
    print("       CLIENT MANAGEMENT SYSTEM")
    print("=" * 40)
    print("\nSTEP 1: Checking Virtual Environment...")
    # (Passed successfully since we are in the venv)

    print("STEP 2: Verifying Database Credentials...")
    db_url = get_db_url()
    if not db_url:
        print("ERROR: Could not read database credentials from backend/database.py")
        sys.exit(1)
        
    import sqlalchemy  # type: ignore
    from sqlalchemy import create_engine, text, inspect  # type: ignore
    
    parsed = urllib.parse.urlparse(db_url)
    db_name = parsed.path.lstrip('/')
    base_url = db_url.replace(parsed.path, '/postgres')
    
    engine_base = create_engine(base_url)
    try:
        with engine_base.connect() as conn:
            pass
    except Exception as e:
        print(f"ERROR: Database credentials verification failed.\n{e}")
        sys.exit(1)
        
    print("STEP 3: Checking Database Existence...")
    try:
        with engine_base.connect() as conn:
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'")).fetchone()
            if not result:
                print(f"\nERROR: Database '{db_name}' does not exist.")
                print("Please create the database and try again.")
                sys.exit(1)
    except Exception as e:
        print(f"ERROR: Checking database existence failed.\n{e}")
        sys.exit(1)
        
    print("STEP 4: Validating Database Schema...")
    sys.path.insert(0, os.path.abspath("backend"))
    from database import engine  # type: ignore
    import models  # type: ignore
    
    print("\nDATABASE VALIDATION\n")
    print("[✓] Database connection successful")
    print(f"[✓] Database '{db_name}' exists")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    target_metadata = models.Base.metadata
    
    # Automatically and safely create all missing tables (handles Foreign Key order automatically)
    target_metadata.create_all(engine)
    
    for table_name, table in target_metadata.tables.items():
        if table_name not in existing_tables:
            print(f"[+] Missing table '{table_name}' created with all constraints")
        else:
            print(f"[✓] {table_name.capitalize()} table exists")
            existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
            for column in table.columns:
                if column.name not in existing_columns:
                    col_type = column.type.compile(engine.dialect)
                    alter_stmt = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}"
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(alter_stmt))
                            conn.commit()
                        print(f"[+] Missing column '{column.name}' added to {table_name} table")
                    except Exception as e:
                        print(f"ERROR: Failed to add column {column.name} to {table_name}. {e}")
                        sys.exit(1)
                        
    print("[✓] All required tables and columns validated\n")
    
    backend_running = is_port_in_use(8000)
    frontend_running = is_port_in_use(5173)

    print("=" * 40)
    print("APPLICATION STARTING...")
    print("=" * 40)
    print(f"Backend:  {'Already Running' if backend_running else 'Starting...'}")
    print("Database: Connected")
    print("Schema:   Validated")
    print(f"Frontend: {'Already Running' if frontend_running else 'Starting...'}")
    print("\nFrontend URL: http://localhost:5173")
    print("Backend URL:  http://localhost:8000")
    print("=" * 40)
    print("Press Ctrl+C to stop all servers.")
    print("=" * 40 + "\n")

    if not backend_running:
        backend_process = subprocess.Popen('cd backend && .\\venv\\Scripts\\activate && uvicorn main:app --reload', shell=True, stdin=subprocess.DEVNULL)
    if not frontend_running:
        frontend_process = subprocess.Popen('cd frontend && npm run dev', shell=True, stdin=subprocess.DEVNULL)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping servers...")
        if os.name == 'nt':
            if not backend_running and 'backend_process' in locals():
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(backend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if not frontend_running and 'frontend_process' in locals():
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        sys.exit(0)

if __name__ == '__main__':
    main()
