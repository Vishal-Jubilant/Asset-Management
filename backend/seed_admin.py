from database import SessionLocal
import models

db = SessionLocal()

# Check if admin exists
admin_user = db.query(models.User).filter(models.User.empCode == 'admin').first()

if not admin_user:
    new_admin = models.User(
        name="Administrator",
        mailid="admin@assetflow.com",
        empCode="admin",
        mobile="1234567890",
        role="Admin",
        department="IT",
        password="admin",
        status="Active",
        firstLogin=True,
    )
    db.add(new_admin)
    db.commit()
    print("Admin user created successfully.")
else:
    print("Admin user already exists.")

db.close()
