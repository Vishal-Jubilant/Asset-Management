import models
from database import engine, SessionLocal

# Create tables
models.Base.metadata.create_all(bind=engine)

def init_db():
    db = SessionLocal()
    
    # Check if we already have users
    if db.query(models.User).count() == 0:
        # Initial mock users
        users = [
            models.User(id=1, name="System Admin", mailid="admin@donezo.com", empCode="admin", mobile="+91 00000 00000", role="admin", department="Administration", password="admin", status="Active", firstLogin=False, reportingTo=None, reportingRole=None),
            models.User(id=2, name="Vishal", mailid="vdj716@gmail.com", empCode="641664", mobile="", role="manager", department="IT", password="password123", status="Active", firstLogin=True, reportingTo="System Admin", reportingRole="admin")
        ]
        db.add_all(users)
        
    if db.query(models.Role).count() == 0:
        roles = [
            models.Role(id=1, name="admin", level=1),
            models.Role(id=2, name="md", level=2),
            models.Role(id=3, name="manager", level=3),
            models.Role(id=4, name="incharge", level=4),
            models.Role(id=5, name="user", level=5)
        ]
        db.add_all(roles)
        
    if db.query(models.Category).count() == 0:
        categories = [
            models.Category(id=1, value="Laptop", label="Laptop"),
            models.Category(id=2, value="Desktop", label="Desktop"),
            models.Category(id=3, value="Monitor", label="Monitor"),
            models.Category(id=4, value="Keyboard", label="Keyboard"),
            models.Category(id=5, value="Mouse", label="Mouse"),
            models.Category(id=6, value="Printer", label="Printer"),
            models.Category(id=7, value="Other", label="Other")
        ]
        db.add_all(categories)

    db.commit()
    db.close()
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db()
