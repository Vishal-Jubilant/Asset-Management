import os
import sys
import time
import subprocess
import socket
import urllib.parse
import re

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('8.8.8.8', 80))
            return s.getsockname()[0]
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return '127.0.0.1'

def is_port_in_use(port, host=None):
    hosts_to_check = ['127.0.0.1']
    if host and host not in hosts_to_check:
        hosts_to_check.append(host)
    for h in hosts_to_check:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                if s.connect_ex((h, port)) == 0:
                    return True
        except Exception:
            pass
    return False

def get_db_url():
    try:
        with open(os.path.join(BACKEND_DIR, "database.py"), "r") as f:
            content = f.read()
        match = re.search(r'SQLALCHEMY_DATABASE_URL\s*=\s*["\']([^"\']+)["\']', content)
        if match:
            return match.group(1)
    except Exception:
        pass
    return None

def repair_venv_if_needed(venv_path):
    pyvenv_cfg = os.path.join(venv_path, "pyvenv.cfg")
    if not os.path.exists(pyvenv_cfg):
        return
    try:
        with open(pyvenv_cfg, "r") as f:
            lines = f.readlines()
        home_path = None
        for line in lines:
            if line.strip().startswith("home ="):
                home_path = line.split("=", 1)[1].strip()
                break
        
        # If the recorded home path does not exist, update it to the active Python directory
        if home_path and not os.path.exists(home_path):
            current_py_dir = os.path.dirname(sys.executable)
            new_lines = []
            for line in lines:
                if line.strip().startswith("home ="):
                    new_lines.append(f"home = {current_py_dir}\n")
                elif line.strip().startswith("executable ="):
                    new_lines.append(f"executable = {sys.executable}\n")
                else:
                    new_lines.append(line)
            with open(pyvenv_cfg, "w") as f:
                f.writelines(new_lines)
    except Exception:
        pass

def stop_process(proc):
    if not proc or proc.poll() is not None:
        return
    try:
        if os.name == 'nt':
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
    except Exception:
        pass

def main():
    # STEP 1: Virtual Environment Check & Activation
    venv_path = os.path.join(BACKEND_DIR, "venv")
    python_exe = os.path.join(venv_path, "Scripts", "python.exe") if os.name == "nt" else os.path.join(venv_path, "bin", "python")

    # Repair venv if pyvenv.cfg points to an invalid path from another machine/user
    repair_venv_if_needed(venv_path)

    # Check if we are running inside the venv
    in_venv = False
    if os.path.exists(python_exe):
        try:
            in_venv = os.path.samefile(sys.executable, python_exe)
        except (FileNotFoundError, OSError, ValueError):
            in_venv = os.path.normcase(sys.executable) == os.path.normcase(os.path.abspath(python_exe))

    if not in_venv:
        if not os.path.exists(python_exe):
            print("=" * 40)
            print("       CLIENT MANAGEMENT SYSTEM")
            print("=" * 40)
            print("\nSTEP 1: Checking Virtual Environment...")
            print("ERROR: Python virtual environment not found in backend/venv.")
            sys.exit(1)
        try:
            sys.exit(subprocess.call([python_exe, os.path.abspath(__file__)] + sys.argv[1:]))
        except KeyboardInterrupt:
            sys.exit(0)

    # Guaranteed to be running inside the venv
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
    base_url = urllib.parse.urlunparse(parsed._replace(path='/postgres'))
    
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
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": db_name}
            ).fetchone()
            
            if not result:
                print(f"[!] Database '{db_name}' does not exist. Creating it automatically...")
                with engine_base.connect().execution_options(isolation_level="AUTOCOMMIT") as autocommit_conn:
                    autocommit_conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                print(f"[+] Database '{db_name}' created successfully.")
    except Exception as e:
        print(f"ERROR: Checking/creating database failed.\n{e}")
        sys.exit(1)
        
    print("STEP 4: Validating Database Schema...")
    if BACKEND_DIR not in sys.path:
        sys.path.insert(0, BACKEND_DIR)
    from database import engine  # type: ignore
    import models  # type: ignore
    
    print("\nDATABASE VALIDATION\n")
    print("[OK] Database connection successful")
    print(f"[OK] Database '{db_name}' exists")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    target_metadata = models.Base.metadata
    
    # Automatically and safely create all missing tables (handles Foreign Key order automatically)
    target_metadata.create_all(engine)
    
    for table_name, table in target_metadata.tables.items():
        if table_name not in existing_tables:
            print(f"[+] Missing table '{table_name}' created with all constraints")
        else:
            print(f"[OK] {table_name.capitalize()} table exists")
            existing_columns_map = {col['name'].lower(): col['name'] for col in inspector.get_columns(table_name)}
            for column in table.columns:
                if column.name.lower() not in existing_columns_map:
                    col_type = column.type.compile(engine.dialect)
                    alter_stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type}'
                    try:
                        with engine.connect() as conn:
                            conn.execute(text(alter_stmt))
                            conn.commit()
                        print(f"[+] Missing column '{column.name}' added to {table_name} table")
                    except Exception as e:
                        print(f"ERROR: Failed to add column {column.name} to {table_name}. {e}")
                        sys.exit(1)
                        
    print("[OK] All required tables and columns validated\n")
    
    print("STEP 5: Creating Default Admin User...")
    from sqlalchemy.orm import sessionmaker  # type: ignore
    import hashlib

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        admin_user = db.query(models.User).filter(
            (models.User.empCode == 'Admin') | (models.User.mailid == 'admin@system.local')
        ).first()
        admin_password = "Admin@123"
        sha_hash = hashlib.sha256(admin_password.encode()).hexdigest()

        if not admin_user:
            new_admin = models.User(
                name="Administrator",
                mailid="admin@system.local",
                empCode="Admin",
                password=admin_password,
                role="Admin",
                status="Active",
                firstLogin=False
            )
            db.add(new_admin)
            db.commit()
            print("[+] Admin user 'Administrator' created successfully.")
        else:
            # If the admin password was previously set to SHA-256 hash, update to plain text so login succeeds
            if admin_user.password == sha_hash:
                admin_user.password = admin_password
                db.commit()
                print("[OK] Admin user password synchronized with authentication service.")
            else:
                print("[OK] Admin user already exists.")
    except Exception as e:
        print(f"[-] Error creating admin user: {e}")
    finally:
        db.close()
        
    print()
    local_ip = get_local_ip()
    backend_running = is_port_in_use(4000, host=local_ip)
    frontend_running = is_port_in_use(4001, host=local_ip)

    print("=" * 40)
    print("APPLICATION STARTING...")
    print("=" * 40)
    print(f"Backend:  {'Already Running' if backend_running else 'Starting...'}")
    print("Database: Connected")
    print("Schema:   Validated")
    print(f"Frontend: {'Already Running' if frontend_running else 'Starting...'}")
    print(f"\nFrontend URL: http://localhost:4001  (Network: http://{local_ip}:4001)")
    print(f"Backend URL:  http://localhost:4000  (Network: http://{local_ip}:4000)")
    print("=" * 40)
    print("Press Ctrl+C to stop all servers.")
    print("=" * 40 + "\n")

    backend_process = None
    frontend_process = None

    if not backend_running:
        backend_cmd = [python_exe, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "4000"]
        backend_process = subprocess.Popen(
            backend_cmd,
            cwd=BACKEND_DIR,
            stdin=subprocess.DEVNULL
        )
    if not frontend_running:
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
        if not os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
            print("[+] frontend/node_modules not found. Installing frontend dependencies...")
            subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR)
        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev", "--", "--host", "0.0.0.0", "--port", "4001"],
            cwd=FRONTEND_DIR,
            stdin=subprocess.DEVNULL
        )

    try:
        while True:
            if backend_process and backend_process.poll() is not None:
                print(f"\n[!] Backend process exited with code {backend_process.returncode}.")
                break
            if frontend_process and frontend_process.poll() is not None:
                print(f"\n[!] Frontend process exited with code {frontend_process.returncode}.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping servers...")
    finally:
        stop_process(backend_process)
        stop_process(frontend_process)
        sys.exit(0)

if __name__ == '__main__':
    main()
