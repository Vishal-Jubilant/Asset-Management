from database import SessionLocal
import models
from main import format_user

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.mailid == 'test@donezo.com').first()
    if user:
        print(format_user(user))
    else:
        print("User not found.")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
