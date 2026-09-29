import database
from sqlalchemy import text

db = database.SessionLocal()
try:
    db.execute(text("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));"))
    db.execute(text("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));"))
    db.execute(text("SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));"))
    db.commit()
    print("Database ID sequences fixed successfully!")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
