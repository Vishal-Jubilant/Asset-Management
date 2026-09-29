from database import SessionLocal
import models
import datetime
import random
import uuid

db = SessionLocal()

def seed_data():
    users = db.query(models.User).all()
    if not users:
        print("No users found")
        return
        
    md_user = next((u for u in users if u.empCode.lower() == 'md' or u.name.lower() == 'md'), users[0])
    other_user = users[-1]
    
    statuses = ['Approved', 'Pending', 'Returned', 'Rejected']
    categories = ['Laptop', 'Mobile', 'Server', 'Software']
    
    # Generate dates across the last 2 years
    now = datetime.datetime.now()
    dates = []
    
    # 5 days ago to today
    for _ in range(15):
        days_ago = random.randint(0, 5)
        dates.append(now - datetime.timedelta(days=days_ago))
        
    # Weeks ago
    for _ in range(20):
        days_ago = random.randint(7, 21)
        dates.append(now - datetime.timedelta(days=days_ago))
        
    # Months ago
    for _ in range(30):
        days_ago = random.randint(30, 300)
        dates.append(now - datetime.timedelta(days=days_ago))
        
    # Over a year ago
    for _ in range(15):
        days_ago = random.randint(365, 700)
        dates.append(now - datetime.timedelta(days=days_ago))
        
    for i, d in enumerate(dates):
        # 50% created by MD, 50% received by MD
        is_mine = i % 2 == 0
        
        req = models.AssetRequest(
            id=f"REQ-{uuid.uuid4().hex[:6].upper()}",
            item=f"Mock Item {i}",
            category=random.choice(categories),
            amount=random.randint(100, 5000),
            justification="Mock data for testing charts",
            requestedBy=md_user.id if is_mine else other_user.id,
            forwardedTo=[] if is_mine else [{"value": md_user.name, "label": md_user.name}],
            routedTo=[],
            status=random.choice(statuses),
            createdAt=d.isoformat(),
            updatedAt=d.isoformat()
        )
        db.add(req)
        
    db.commit()
    print(f"Added {len(dates)} mock requests successfully.")

if __name__ == "__main__":
    seed_data()
