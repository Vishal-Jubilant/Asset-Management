import database
import models
from sqlalchemy.orm import Session

db = database.SessionLocal()
try:
    user = db.query(models.User).filter(models.User.mailid == "admin@donezo.com").first()
    print("User found:", user.name if user else "None")
    print("Security questions:", user.securityQuestions if user else "N/A")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
