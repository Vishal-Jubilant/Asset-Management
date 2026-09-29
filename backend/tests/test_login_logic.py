import database
import models
from sqlalchemy.orm import Session

db = database.SessionLocal()
try:
    req_mailid = "admin@donezo.com"
    req_password = "admin"
    user = db.query(models.User).filter(
        (models.User.mailid == req_mailid) | (models.User.empCode == req_mailid),
        models.User.password == req_password
    ).first()
    
    if not user:
        print("Not found")
    else:
        user_dict = {c.name: getattr(user, c.name) for c.name in user.__table__.columns.keys()}
        print(user_dict)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
