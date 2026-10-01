from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
import uuid

import models
from database import engine, get_db

# Create tables if not exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class LoginRequest(BaseModel):
    mailid: str
    password: str

class SetupRequest(BaseModel):
    password: str
    securityQuestions: list

class VerifySecurityRequest(BaseModel):
    loginId: str
    questionId: str
    answer: str

class ResetPasswordRequest(BaseModel):
    loginId: str
    newPassword: str

class CategoryCreate(BaseModel):
    value: str
    label: str

class RoleCreate(BaseModel):
    name: str
    level: int

from typing import List, Optional, Union

class UserCreate(BaseModel):
    name: str
    mailid: str
    empCode: str
    mobile: str
    role: str
    department: str
    status: str
    reportingTo: Optional[Union[str, List[str]]] = None
    reportingRole: Optional[str] = None
    password: Optional[str] = "password123"




class AssetRequestCreate(BaseModel):
    assetType: str
    otherAssetType: Optional[str] = ""
    description: str
    justification: str
    selectedReportingTo: Optional[Any] = None
    requestedBy: int
    attachments: Optional[list] = []

class ActionRequest(BaseModel):
    action: str
    remarks: Optional[str] = ""
    selectedApprovers: Optional[Any] = None
    userId: int  # The user making the action

def format_user(user):
    u_dict = {c: getattr(user, c) for c in user.__table__.columns.keys()}
    rep = u_dict.get("reportingTo")
    if rep and isinstance(rep, str):
        u_dict["reportingTo"] = [x.strip() for x in rep.split(",") if x.strip()]
    elif rep is None or (isinstance(rep, str) and not rep.strip()):
        u_dict["reportingTo"] = []
    return u_dict

@app.post("/api/auth/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.mailid == req.mailid) | (models.User.empCode == req.mailid),
        models.User.password == req.password
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.status == 'Inactive':
        raise HTTPException(status_code=403, detail="This account is inactive")
    
    user_dict = format_user(user)
    return {"token": f"fake-jwt-token-{user.id}", "user": user_dict}

@app.get("/api/auth/me")
async def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer fake-jwt-token-"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        user_id = int(authorization.replace("Bearer fake-jwt-token-", ""))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return format_user(user)

@app.post("/api/auth/setup/{user_id}")
async def setup_account(user_id: int, req: SetupRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.password = req.password
    user.firstLogin = False
    user.securityQuestions = req.securityQuestions
    
    db.add(user)
    db.commit()
    return {"message": "Account setup successfully"}

@app.get("/api/auth/security-questions/{login_id}")
async def get_security_questions(login_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.mailid == login_id) | (models.User.empCode == login_id)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status == 'Inactive':
        raise HTTPException(status_code=403, detail="This account is inactive")
    if not user.securityQuestions:
        raise HTTPException(status_code=400, detail="Security questions not set up for this account. Contact admin.")
    
    # Return questions without answers
    questions = [{"id": q["id"], "text": q["text"]} for q in user.securityQuestions]
    return {"questions": questions}

@app.post("/api/auth/verify-security-answer")
async def verify_security_answer(req: VerifySecurityRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.mailid == req.loginId) | (models.User.empCode == req.loginId)
    ).first()
    if not user or not user.securityQuestions:
        raise HTTPException(status_code=400, detail="Invalid request")
        
    for q in user.securityQuestions:
        if q["id"] == req.questionId:
            if q["answer"].lower() == req.answer.lower():
                return {"valid": True}
    return {"valid": False}

@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.mailid == req.loginId) | (models.User.empCode == req.loginId)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password = req.newPassword
    db.add(user)
    db.commit()
    return {"message": "Password reset successfully"}

@app.get("/api/users")
async def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [format_user(u) for u in users]

def get_caller(authorization, db):
    if not authorization or not authorization.startswith("Bearer fake-jwt-token-"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        user_id = int(authorization.replace("Bearer fake-jwt-token-", ""))
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/api/users")
async def create_user(req: UserCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    if not caller.role or caller.role.lower() != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create users")

    rep_to = req.reportingTo
    if isinstance(rep_to, list):
        rep_to = ", ".join(rep_to)
        
    user = models.User(
        name=req.name, mailid=req.mailid, empCode=req.empCode, mobile=req.mobile,
        role=req.role, department=req.department, status=req.status,
        reportingTo=rep_to, reportingRole=req.reportingRole, password=req.password
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return format_user(user)

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, req: UserCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    is_admin = bool(caller.role and caller.role.lower() == 'admin')
    if not is_admin and caller.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this user")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    
    # Protect admin account
    target_is_admin = bool(user.role and user.role.lower() == 'admin')
    if target_is_admin:
        if not req.role or req.role.lower() != 'admin':
            raise HTTPException(status_code=403, detail="Cannot change admin role")
        if req.status != 'Active':
            raise HTTPException(status_code=403, detail="Cannot deactivate admin account")
    
    rep_to = req.reportingTo
    if isinstance(rep_to, list):
        rep_to = ", ".join(rep_to)
        
    user.name = req.name
    
    # Do not allow deleting admin mailid or empCode
    if not target_is_admin or (req.mailid.strip() and req.empCode.strip()):
        user.mailid = req.mailid
        user.empCode = req.empCode
        
    user.mobile = req.mobile
    user.role = req.role
    user.department = req.department
    user.status = req.status
    user.reportingTo = rep_to
    user.reportingRole = req.reportingRole
    
    if req.password and req.password.strip():
        user.password = req.password
        
    db.commit()
    return format_user(user)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    if not caller.role or caller.role.lower() != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        if user.role and user.role.lower() == 'admin':
            raise HTTPException(status_code=403, detail="Admin account cannot be deleted")
            
        # Delete dependent asset requests to avoid Foreign Key constraint violation
        db.query(models.AssetRequest).filter(models.AssetRequest.requestedBy == user_id).delete()
        
        db.delete(user)
        db.commit()
    return {"message": "Deleted"}

@app.get("/api/roles")
async def get_roles(db: Session = Depends(get_db)):
    roles = db.query(models.Role).order_by(models.Role.level).all()
    return [{c: getattr(r, c) for c in r.__table__.columns.keys()} for r in roles]

@app.post("/api/roles")
async def create_role(req: RoleCreate, db: Session = Depends(get_db)):
    role = models.Role(name=req.name, level=req.level)
    db.add(role)
    db.commit()
    db.refresh(role)
    return {c: getattr(role, c) for c in role.__table__.columns.keys()}

@app.delete("/api/roles/{role_name}")
async def delete_role(role_name: str, db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.name == role_name).first()
    if role:
        db.delete(role)
        db.commit()
    return {"message": "Deleted"}

@app.post("/api/roles/batch")
async def batch_update_roles(req: List[RoleCreate], db: Session = Depends(get_db)):
    db.query(models.Role).delete()
    for r in req:
        db.add(models.Role(name=r.name, level=r.level))
    db.commit()
    return {"message": "Roles updated"}


@app.get("/api/categories")
async def get_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Category).all()
    return [{c: getattr(cat, c) for c in cat.__table__.columns.keys()} for cat in categories]

@app.post("/api/categories", status_code=201)
async def create_category(req: CategoryCreate, db: Session = Depends(get_db)):
    val = req.value[0].upper() + req.value[1:] if req.value else req.value
    lbl = req.label[0].upper() + req.label[1:] if req.label else req.label
    
    # Check if exists
    existing = db.query(models.Category).filter(models.Category.value == val).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    new_cat = models.Category(value=val, label=lbl)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return {c: getattr(new_cat, c) for c in new_cat.__table__.columns.keys()}

@app.put("/api/categories/{old_value}")
async def update_category(old_value: str, req: CategoryCreate, db: Session = Depends(get_db)):
    val = req.value[0].upper() + req.value[1:] if req.value else req.value
    lbl = req.label[0].upper() + req.label[1:] if req.label else req.label
    
    cat = db.query(models.Category).filter(models.Category.value == old_value).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Check if new value already exists in another category
    if old_value != val:
        existing = db.query(models.Category).filter(models.Category.value == val).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category already exists")
            
    cat.value = val
    cat.label = lbl
    db.commit()
    db.refresh(cat)
    return {c: getattr(cat, c) for c in cat.__table__.columns.keys()}

@app.delete("/api/categories/{value}")
async def delete_category(value: str, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.value == value).first()
    if cat:
        db.delete(cat)
        db.commit()
    return {"message": "Category deleted"}


@app.get("/api/asset-requests")
async def get_asset_requests(db: Session = Depends(get_db)):
    requests = db.query(models.AssetRequest).order_by(desc(models.AssetRequest.createdAt)).all()
    return [{c: getattr(r, c) for c in r.__table__.columns.keys()} for r in requests]

@app.post("/api/asset-requests", status_code=201)
async def create_asset_request(request: AssetRequestCreate, db: Session = Depends(get_db)):
    # Generate a strictly unique sequential ID like REQ-0001
    last_request = db.query(models.AssetRequest).filter(models.AssetRequest.id.like("REQ-%")).order_by(desc(models.AssetRequest.id)).first()
    
    next_num = 1
    if last_request:
        try:
            # Extract number from REQ-XXXX
            num_part = last_request.id.split("-")[1]
            next_num = int(num_part) + 1
        except:
            count = db.query(models.AssetRequest).count()
            next_num = count + 1
            
    # Strict duplicate check loop to prevent race condition overlaps
    while True:
        new_id = f"REQ-{next_num:04d}"
        exists = db.query(models.AssetRequest).filter(models.AssetRequest.id == new_id).first()
        if not exists:
            break
        next_num += 1
    
    item = request.description or (request.otherAssetType if request.assetType == "Other" else request.assetType)
    
    # Enforce first letter capitalization at the database level
    if item and isinstance(item, str) and len(item) > 0:
        item = item[0].upper() + item[1:]
        
    justification = request.justification
    if justification and isinstance(justification, str) and len(justification) > 0:
        justification = justification[0].upper() + justification[1:]
    
    # Adjust initial status based on user role if needed
    user = db.query(models.User).filter(models.User.id == request.requestedBy).first()
    status = "Pending with Manager"
    if user and user.reportingRole:
        rr = user.reportingRole
        status = f"Pending with {'MD' if rr.lower() == 'md' else rr.capitalize()}"

    new_request = models.AssetRequest(
        id=new_id,
        item=item,
        category=request.assetType,
        amount=0,
        justification=justification,
        requestedBy=request.requestedBy,
        forwardedTo=request.selectedReportingTo,
        routedTo=request.selectedReportingTo,
        status=status,
        handledBy=[],
        votes={},
        approverSelections={},
        commentsHistory=[],
        attachments=request.attachments,
        createdAt=datetime.now().isoformat(),
        updatedAt=datetime.now().isoformat()
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return {c: getattr(new_request, c) for c in new_request.__table__.columns.keys()}

@app.put("/api/asset-requests/{request_id}/action")
async def process_request_action(request_id: str, payload: ActionRequest, db: Session = Depends(get_db)):
    r = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if r is None:
        raise HTTPException(status_code=404, detail="Request not found")
        
    user = db.query(models.User).filter(models.User.id == payload.userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    all_users = db.query(models.User).all()

    action = payload.action
    remarks = payload.remarks
    selectedApprovers = payload.selectedApprovers

    newStatus = r.status
    
    # Make copies of JSON fields to update them properly in SQLAlchemy
    handledBy = list(r.handledBy) if r.handledBy else []
    votes = dict(r.votes) if r.votes else {}
    approverSelections = dict(r.approverSelections) if r.approverSelections else {}
    commentsHistory = list(r.commentsHistory) if r.commentsHistory else []
    forwardedTo = None
    if r.forwardedTo:
        forwardedTo = r.forwardedTo if isinstance(r.forwardedTo, list) else [r.forwardedTo]

    if payload.userId not in handledBy:
        handledBy.append(payload.userId)

    votes[str(payload.userId)] = action

    if forwardedTo and len(forwardedTo) > 1:
        forwardedToIds = []
        for name in forwardedTo:
            searchName = name.get("value", name.get("label", str(name))) if isinstance(name, dict) else str(name)
            u = next((uObj for uObj in all_users if getattr(uObj, "name", "").lower().strip() == searchName.lower().strip()), None)
            if u: forwardedToIds.append(u.id)
            
        allVoted = all(uid in handledBy for uid in forwardedToIds)
        if allVoted:
            approves = sum(1 for uid in forwardedToIds if votes.get(str(uid)) == 'approve')
            rejects = sum(1 for uid in forwardedToIds if votes.get(str(uid)) == 'reject')
            returns = sum(1 for uid in forwardedToIds if votes.get(str(uid)) == 'return')
            
            def getNextAdvanceStatus():
                if user.reportingRole:
                    rr = user.reportingRole
                    return f"Pending with {'MD' if rr.lower() == 'md' else rr.capitalize()}"
                return 'Approved'
                
            totalVoters = len(forwardedToIds)
            if totalVoters == 2:
                if approves == 2: newStatus = getNextAdvanceStatus()
                elif rejects == 2: newStatus = 'Rejected'
                elif returns == 2: newStatus = 'Returned'
                else: newStatus = 'Hold'
            else:
                maxV = max(approves, rejects, returns)
                winners = []
                if approves == maxV: winners.append('approve')
                if rejects == maxV: winners.append('reject')
                if returns == maxV: winners.append('return')
                
                if len(winners) > 1:
                    newStatus = 'Hold'
                else:
                    winner = winners[0]
                    if winner == 'approve': newStatus = getNextAdvanceStatus()
                    elif winner == 'reject': newStatus = 'Rejected'
                    elif winner == 'return': newStatus = 'Returned'
    else:
        if action == 'reject': newStatus = 'Rejected'
        elif action == 'return': newStatus = 'Returned'
        elif action == 'approve':
            if user.reportingRole:
                rr = user.reportingRole
                newStatus = f"Pending with {'MD' if rr.lower() == 'md' else rr.capitalize()}"
            else:
                newStatus = 'Approved'

    updatedForwardedTo = forwardedTo
    if action == 'approve':
        if selectedApprovers:
            approverSelections[str(payload.userId)] = selectedApprovers
        if newStatus != r.status:
            if "Pending" in newStatus:
                combinedForwardedTo = set()
                if forwardedTo:
                    for nameObj in forwardedTo:
                        searchName = nameObj.get("value", nameObj.get("label", str(nameObj))) if isinstance(nameObj, dict) else str(nameObj)
                        u = next((uObj for uObj in all_users if getattr(uObj, "name", "").lower().strip() == searchName.lower().strip()), None)
                        if u and str(u.id) in approverSelections:
                            for s in approverSelections[str(u.id)]: combinedForwardedTo.add(s)
                if len(combinedForwardedTo) > 0:
                    updatedForwardedTo = list(combinedForwardedTo)
                else:
                    updatedForwardedTo = selectedApprovers if selectedApprovers else None
            else:
                updatedForwardedTo = None

    finalComment = remarks.strip() if remarks and remarks.strip() else "No comments filled"
    commentsHistory.append({
        "name": user.name,
        "role": 'MD' if user.role == 'md' else (user.role.capitalize() if user.role else ""),
        "comment": finalComment,
        "date": datetime.now().isoformat(),
        "action": action
    })

    # Apply changes to SQLAlchemy model
    r.status = newStatus
    r.handledBy = handledBy
    r.votes = votes
    r.approverSelections = approverSelections
    r.commentsHistory = commentsHistory
    
    if updatedForwardedTo is not None:
        r.forwardedTo = updatedForwardedTo
    elif forwardedTo and "Pending" not in newStatus:
        r.forwardedTo = None

    r.updatedAt = datetime.now().isoformat()
    
    # Needs explicit commit to save json modifications properly sometimes
    db.add(r)
    db.commit()
    db.refresh(r)
    
    return {c: getattr(r, c) for c in r.__table__.columns.keys()}

@app.delete("/api/asset-requests/{request_id}")
async def delete_asset_request(request_id: str, db: Session = Depends(get_db)):
    r = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if r:
        db.delete(r)
        db.commit()
    return {"message": "Deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
