import os
import uuid
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict, Literal, Union
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.orm.attributes import flag_modified

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
    questionId: str
    answer: str

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
    mobile: Optional[str] = ""
    role: Optional[str] = 'User'
    department: str
    departmentRole: Optional[str] = None
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
    selectedReportingRole: Optional[str] = None
    requestedBy: int
    attachments: Optional[list] = []
    approvalSequence: Optional[List[Any]] = None
    returnReply: Optional[str] = ""

class ActionRequest(BaseModel):
    action: Literal['approve', 'reject', 'return']
    remarks: Optional[str] = ""
    selectedApprovers: Optional[Any] = None
    selectedReportingRole: Optional[str] = None
    userId: int  # The user making the action

class ReturnReplyRequest(BaseModel):
    returnReply: str

def format_user(user):
    u_dict = {c: getattr(user, c) for c in user.__table__.columns.keys()}
    rep = u_dict.get("reportingTo")
    if rep and isinstance(rep, str):
        u_dict["reportingTo"] = [x.strip() for x in rep.split(",") if x.strip()]
    elif rep is None or (isinstance(rep, str) and not rep.strip()):
        u_dict["reportingTo"] = []

    dept = u_dict.get("department")
    role = u_dict.get("role") or u_dict.get("departmentRole") or ""
    if dept and role and role.lower() != 'admin':
        u_dict["departmentTitle"] = f"{dept} Department {role}"
    elif role:
        u_dict["departmentTitle"] = role
    else:
        u_dict["departmentTitle"] = ""

    return u_dict

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-asset-management-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def create_access_token(user_id: int, role: Optional[str] = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRATION_HOURS)).timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token. Please log in again.")

def get_caller(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: Missing or invalid token format")
    
    token = authorization.split("Bearer ", 1)[1].strip()

    payload = decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    try:
        user_id = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID in token")
            
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status == 'Inactive':
        raise HTTPException(status_code=403, detail="This account is inactive")
    return user

def get_admin_caller(authorization: str, db: Session):
    caller = get_caller(authorization, db)
    if (caller.role or '').strip().lower() != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    return caller

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
    token = create_access_token(user_id=user.id, role=user.role)
    return {"token": token, "user": user_dict}

@app.get("/api/auth/me")
async def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = get_caller(authorization, db)
    return format_user(user)

@app.post("/api/auth/setup/{user_id}")
async def setup_account(user_id: int, req: SetupRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    if caller.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to set up this account")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.firstLogin:
        raise HTTPException(status_code=403, detail="Account setup has already been completed")
    
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
    if user.status == 'Inactive':
        raise HTTPException(status_code=403, detail="This account is inactive")
        
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
    if user.status == 'Inactive':
        raise HTTPException(status_code=403, detail="This account is inactive")
    answer_is_valid = any(
        question.get("id") == req.questionId
        and str(question.get("answer", "")).lower() == req.answer.lower()
        for question in (user.securityQuestions or [])
    )
    if not answer_is_valid:
        raise HTTPException(status_code=403, detail="Incorrect security question or answer")
        
    user.password = req.newPassword
    db.add(user)
    db.commit()
    return {"message": "Password reset successfully"}

@app.get("/api/users")
async def get_users(authorization: str = Header(None), db: Session = Depends(get_db)):
    get_caller(authorization, db)
    users = db.query(models.User).all()

    def user_rank(u):
        r = (u.role or '').lower().strip()
        dr = (u.departmentRole or '').lower().strip()
        code = (u.empCode or '').strip().lower()
        mail = (u.mailid or '').strip().lower()
        name = (u.name or '').strip().lower()
        if r == 'admin' or code == 'admin' or mail == 'admin@system.local' or name == 'administrator':
            return (0, u.id or 0)
        if r == 'md' or dr == 'md' or code == 'md' or mail == 'md@system.local' or name == 'managing director':
            return (1, u.id or 0)
        return (2, u.id or 0)

    sorted_users = sorted(users, key=user_rank)
    return [format_user(u) for u in sorted_users]


@app.post("/api/users")
async def create_user(req: UserCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    if not caller.role or caller.role.lower() != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create users")

    if not req.department or not req.department.strip():
        raise HTTPException(status_code=400, detail="Please select a department")

    rep_to = req.reportingTo
    if isinstance(rep_to, list):
        rep_to = ", ".join(rep_to)
        
    dept = req.department.strip()
    role_input = (req.role or req.departmentRole or 'User').strip()
    if role_input.lower() == 'head':
        role_val = 'Head'
    elif role_input.lower() == 'admin':
        role_val = 'Admin'
    elif role_input.lower() == 'md':
        role_val = 'MD'
    else:
        role_val = 'User'

    user = models.User(
        name=req.name.strip(),
        mailid=req.mailid.strip(),
        empCode=req.empCode.strip(),
        mobile=req.mobile.strip() if req.mobile else "",
        role=role_val,
        department=dept,
        departmentRole=role_val,
        status=req.status,
        reportingTo=rep_to,
        reportingRole=req.reportingRole,
        password=req.password
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
    
    # Protect admin and MD accounts
    target_role = (user.role or '').lower().strip()
    target_dr = (user.departmentRole or '').lower().strip()
    target_code = (user.empCode or '').strip().lower()
    target_mail = (user.mailid or '').strip().lower()
    target_name = (user.name or '').strip().lower()
    target_is_admin = target_role == 'admin' or target_code == 'admin' or target_mail == 'admin@system.local' or target_name == 'administrator'

    if target_is_admin:
        if not req.role or req.role.lower() != 'admin':
            raise HTTPException(status_code=403, detail="Cannot change admin role")
        if req.status != 'Active':
            raise HTTPException(status_code=403, detail="Cannot deactivate admin account")
    
    rep_to = req.reportingTo
    if isinstance(rep_to, list):
        rep_to = ", ".join(rep_to)
        
    user.name = req.name.strip()
    
    # Do not allow deleting admin mailid or empCode
    if (not target_is_admin) or (req.mailid.strip() and req.empCode.strip()):
        user.mailid = req.mailid.strip()
        user.empCode = req.empCode.strip()
        
    user.mobile = req.mobile.strip() if req.mobile else ""
    dept = req.department.strip() if req.department else (user.department or "")
    user.department = dept

    if is_admin:
        role_input = (req.role or req.departmentRole or 'User').strip()
        if role_input.lower() == 'head':
            role_val = 'Head'
        elif role_input.lower() == 'admin':
            role_val = 'Admin'
        elif role_input.lower() == 'md':
            role_val = 'MD'
        else:
            role_val = 'User'
        user.role = role_val
        user.departmentRole = role_val
        
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
        r = (user.role or '').lower().strip()
        dr = (user.departmentRole or '').lower().strip()
        code = (user.empCode or '').strip().lower()
        mail = (user.mailid or '').strip().lower()
        name = (user.name or '').strip().lower()
        if r == 'admin' or code == 'admin' or mail == 'admin@system.local' or name == 'administrator':
            raise HTTPException(status_code=403, detail="Admin account cannot be deleted")
            
        # Delete dependent asset requests to avoid Foreign Key constraint violation
        db.query(models.AssetRequest).filter(models.AssetRequest.requestedBy == user_id).delete()
        
        db.delete(user)
        db.commit()
    return {"message": "Deleted"}

@app.get("/api/roles")
async def get_roles(authorization: str = Header(None), db: Session = Depends(get_db)):
    get_caller(authorization, db)
    roles = db.query(models.Role).order_by(models.Role.level).all()
    return [{c: getattr(r, c) for c in r.__table__.columns.keys()} for r in roles]

@app.post("/api/roles")
async def create_role(req: RoleCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
    role = models.Role(name=req.name, level=req.level)
    db.add(role)
    db.commit()
    db.refresh(role)
    return {c: getattr(role, c) for c in role.__table__.columns.keys()}

@app.delete("/api/roles/{role_name}")
async def delete_role(role_name: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
    role = db.query(models.Role).filter(models.Role.name == role_name).first()
    if role:
        db.delete(role)
        db.commit()
    return {"message": "Deleted"}

@app.post("/api/roles/batch")
async def batch_update_roles(req: List[RoleCreate], authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
    db.query(models.Role).delete()
    for r in req:
        db.add(models.Role(name=r.name, level=r.level))
    db.commit()
    return {"message": "Roles updated"}


@app.get("/api/categories")
async def get_categories(authorization: str = Header(None), db: Session = Depends(get_db)):
    get_caller(authorization, db)
    categories = db.query(models.Category).all()
    return [{c: getattr(cat, c) for c in cat.__table__.columns.keys()} for cat in categories]

@app.post("/api/categories", status_code=201)
async def create_category(req: CategoryCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
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
async def update_category(old_value: str, req: CategoryCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
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
async def delete_category(value: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
    cat = db.query(models.Category).filter(models.Category.value == value).first()
    if cat:
        db.delete(cat)
        db.commit()
    return {"message": "Category deleted"}


# ── Department endpoints ───────────────────────────────────────────────────────

@app.get("/api/departments")
async def get_departments(authorization: str = Header(None), db: Session = Depends(get_db)):
    get_caller(authorization, db)
    depts = db.query(models.Department).all()
    if not depts:
        defaults = [
            models.Department(value="Managing Directory", label="Managing Directory")
        ]
        db.add_all(defaults)
        db.commit()
        depts = db.query(models.Department).all()
    regular_departments = [d for d in depts if (d.value or '').strip().lower() != 'managing directory']
    managing_directory = [d for d in depts if (d.value or '').strip().lower() == 'managing directory']
    sorted_depts = regular_departments + managing_directory
    return [{c: getattr(d, c) for c in d.__table__.columns.keys()} for d in sorted_depts]

@app.post("/api/departments", status_code=201)
async def create_department(req: CategoryCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
    raw_val = req.value.strip() if req.value else ""
    raw_lbl = req.label.strip() if req.label else ""
    if raw_val.upper() in ["IT", "HR", "CSE", "ECE"]:
        val = raw_val.upper()
        lbl = raw_lbl.upper()
    else:
        val = raw_val[0].upper() + raw_val[1:] if raw_val else raw_val
        lbl = raw_lbl[0].upper() + raw_lbl[1:] if raw_lbl else raw_lbl

    existing = db.query(models.Department).filter(models.Department.value == val).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")
    new_dept = models.Department(value=val, label=lbl)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return {c: getattr(new_dept, c) for c in new_dept.__table__.columns.keys()}

@app.put("/api/departments/{old_value}")
async def update_department(old_value: str, req: CategoryCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
    val = req.value[0].upper() + req.value[1:] if req.value else req.value
    lbl = req.label[0].upper() + req.label[1:] if req.label else req.label
    dept = db.query(models.Department).filter(models.Department.value == old_value).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    if old_value != val:
        existing = db.query(models.Department).filter(models.Department.value == val).first()
        if existing:
            raise HTTPException(status_code=400, detail="Department already exists")
    dept.value = val
    dept.label = lbl
    db.commit()
    db.refresh(dept)
    return {c: getattr(dept, c) for c in dept.__table__.columns.keys()}

@app.delete("/api/departments/{value}")
async def delete_department(value: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_admin_caller(authorization, db)
    dept = db.query(models.Department).filter(models.Department.value == value).first()
    if dept:
        db.delete(dept)
        db.commit()
    return {"message": "Department deleted"}


def is_head_user(u):
    if not u or u.status == 'Inactive':
        return False
    r = (u.role or '').lower().strip()
    dr = (u.departmentRole or '').lower().strip()
    return r == 'head' or dr == 'head'

def is_md_user(u):
    if not u or u.status == 'Inactive':
        return False
    r = (u.role or '').lower().strip()
    dr = (u.departmentRole or '').lower().strip()
    code = (u.empCode or '').strip().lower()
    mail = (u.mailid or '').strip().lower()
    name = (u.name or '').strip().lower()
    return r == 'md' or dr == 'md' or code == 'md' or mail == 'md@system.local' or name == 'managing director'

def is_same_department_user_approver(user, requester):
    if not user or not requester or user.status == 'Inactive':
        return False
    user_department = (user.department or '').strip().lower()
    requester_department = (requester.department or '').strip().lower()
    role = (user.role or '').strip().lower()
    return (
        bool(requester_department) and
        user_department == requester_department and
        role != 'admin' and
        not is_head_user(user) and
        not is_md_user(user)
    )

def ensure_default_approvers(db: Session):
    """Guarantees default approvers if configured."""
    pass

@app.get("/api/approvers")
async def get_approvers(authorization: str = Header(None), db: Session = Depends(get_db)):
    get_caller(authorization, db)
    """Returns all eligible approvers grouped: dept heads grouped by department + MD info."""
    ensure_default_approvers(db)
    all_users = db.query(models.User).filter(models.User.status == 'Active').all()
    
    md_users = [u for u in all_users if is_md_user(u)]
    md_user = md_users[0] if md_users else None
    heads = [u for u in all_users if is_head_user(u)]
    
    # Group heads by department
    dept_groups = {}
    for h in heads:
        dept = h.department or 'General'
        if dept not in dept_groups:
            dept_groups[dept] = []
        dept_groups[dept].append({
            "id": h.id,
            "name": h.name,
            "department": h.department,
            "role": "Head",
            "departmentRole": h.departmentRole or "Head",
            "empCode": h.empCode
        })
    
    all_eligible = []
    for h in heads:
        all_eligible.append({
            "id": h.id,
            "name": h.name,
            "department": h.department or "General",
            "role": "Head",
            "departmentRole": h.departmentRole or "Head",
            "empCode": h.empCode
        })
    for m in md_users:
        all_eligible.append({
            "id": m.id,
            "name": m.name,
            "department": m.department or "Management",
            "role": "MD",
            "departmentRole": m.departmentRole or "MD",
            "empCode": m.empCode
        })

    return {
        "md": {
            "id": md_user.id,
            "name": md_user.name,
            "department": md_user.department or "Management",
            "role": "MD",
            "departmentRole": md_user.departmentRole or "MD",
            "empCode": md_user.empCode
        } if md_user else None,
        "mdUsers": [{
            "id": m.id,
            "name": m.name,
            "department": m.department or "Management",
            "role": "MD",
            "departmentRole": m.departmentRole or "MD",
            "empCode": m.empCode
        } for m in md_users],
        "headsByDepartment": dept_groups,
        "allHeads": [{
            "id": h.id,
            "name": h.name,
            "department": h.department,
            "role": "Head",
            "departmentRole": h.departmentRole or "Head",
            "empCode": h.empCode
        } for h in heads],
        "allApprovers": all_eligible
    }

@app.post("/api/asset-requests/validate-approvers", status_code=200)
async def validate_approvers(payload: dict, authorization: str = Header(None), db: Session = Depends(get_db)):
    get_caller(authorization, db)
    """Validates that submitted approvers are legitimate (heads or MD)."""
    approver_names = payload.get("approvers", [])
    all_users = db.query(models.User).filter(models.User.status == 'Active').all()
    
    errors = []
    for name in approver_names:
        u = next((u for u in all_users if u.name.lower().strip() == str(name).lower().strip() and (is_head_user(u) or is_md_user(u))), None)
        if not u:
            u = next((u for u in all_users if u.name.lower().strip() == str(name).lower().strip()), None)
        if not u:
            errors.append(f"User '{name}' not found")
        elif not (is_head_user(u) or is_md_user(u)):
            errors.append(f"'{name}' is not a Head or MD and cannot be an approver")
    
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    return {"valid": True}

@app.get("/api/asset-requests")
async def get_asset_requests(authorization: str = Header(None), db: Session = Depends(get_db)):
    get_caller(authorization, db)
    requests = db.query(models.AssetRequest).order_by(desc(models.AssetRequest.createdAt)).all()
    return [{c: getattr(r, c) for c in r.__table__.columns.keys()} for r in requests]

def build_and_validate_workflow(request: AssetRequestCreate, db: Session):
    requester = db.query(models.User).filter(models.User.id == request.requestedBy).first()
    if not requester:
        raise HTTPException(status_code=400, detail="Requester user does not exist in the database.")
    if requester.status == 'Inactive':
        raise HTTPException(status_code=403, detail="Requester account is inactive.")

    all_users = db.query(models.User).filter(models.User.status == 'Active').all()
    user_is_head = is_head_user(requester)
    req_dept = (requester.department or "").strip().lower()

    workflow = []

    if request.approvalSequence and len(request.approvalSequence) > 0:
        seen_approver_names = set()
        step_counter = 1

        for step_data in request.approvalSequence:
            approver_list = step_data.get("approvers", [])
            if not approver_list and "name" in step_data:
                approver_list = [step_data["name"]]
            if not approver_list:
                continue

            validated_names = []
            validated_ids = []
            step_role = step_data.get("role", "Head")
            step_dept = step_data.get("department", "")
            step_approver_id = step_data.get("id") or step_data.get("approverId")

            for name in approver_list:
                clean_name = str(name).strip()
                target_u = None
                if step_approver_id:
                    target_u = next((u for u in all_users if str(u.id) == str(step_approver_id) and (
                        is_head_user(u) or is_md_user(u) or is_same_department_user_approver(u, requester)
                    )), None)
                if not target_u:
                    target_u = next((u for u in all_users if u.name.lower().strip() == clean_name.lower() and (
                        is_head_user(u) or is_md_user(u) or is_same_department_user_approver(u, requester)
                    )), None)
                if not target_u:
                    raise HTTPException(status_code=400, detail=f"Approver '{clean_name}' does not exist or is inactive.")

                if clean_name.lower() in seen_approver_names:
                    raise HTTPException(status_code=400, detail=f"Duplicate approver '{clean_name}' detected in workflow.")
                seen_approver_names.add(clean_name.lower())

                if target_u.id == requester.id:
                    raise HTTPException(status_code=400, detail="Requester cannot be assigned as an approver in their own workflow.")

                if is_md_user(target_u):
                    validated_names.append(target_u.name)
                    validated_ids.append(target_u.id)
                    step_role = "MD"
                    step_dept = None
                elif is_head_user(target_u):
                    validated_names.append(target_u.name)
                    validated_ids.append(target_u.id)
                    step_role = "Head"
                    if not step_dept and target_u.department:
                        step_dept = target_u.department
                else:
                    if not is_same_department_user_approver(target_u, requester):
                        raise HTTPException(status_code=400, detail=f"User '{clean_name}' is not eligible to approve this request.")
                    validated_names.append(target_u.name)
                    validated_ids.append(target_u.id)
                    step_role = (target_u.role or target_u.departmentRole or 'User').strip().title()
                    step_dept = target_u.department

            if validated_names:
                workflow.append({
                    "step": step_counter,
                    "role": step_role,
                    "department": step_dept,
                    "approvers": validated_names,
                    "approverIds": validated_ids,
                    "status": "pending" if step_counter == 1 else "waiting"
                })
                step_counter += 1

        # Ensure at least one approver in workflow
        if len(workflow) == 0:
            raise HTTPException(status_code=400, detail="The approval sequence must contain at least one approver.")
    else:
        # Dynamic fallback: build sequence automatically from DB
        step_counter = 1
        if not user_is_head and req_dept:
            dept_heads = [u for u in all_users if is_head_user(u) and (u.department or '').strip().lower() == req_dept and u.id != requester.id]
            if dept_heads:
                workflow.append({
                    "step": step_counter,
                    "role": "Head",
                    "department": requester.department,
                    "approvers": [dept_heads[0].name],
                    "status": "pending"
                })
                step_counter += 1

        if request.selectedReportingTo:
            to_list = request.selectedReportingTo if isinstance(request.selectedReportingTo, list) else [request.selectedReportingTo]
            existing_approvers = {name.lower() for s in workflow for name in s["approvers"]}
            for name in to_list:
                clean_name = str(name).strip()
                if clean_name.lower() in existing_approvers:
                    continue
                target_u = next((u for u in all_users if u.name.lower().strip() == clean_name.lower()), None)
                if target_u and target_u.id != requester.id:
                    if is_md_user(target_u):
                        workflow.append({
                            "step": step_counter,
                            "role": "MD",
                            "department": None,
                            "approvers": [target_u.name],
                            "status": "pending" if step_counter == 1 else "waiting"
                        })
                        step_counter += 1
                        existing_approvers.add(clean_name.lower())
                    elif is_head_user(target_u):
                        workflow.append({
                            "step": step_counter,
                            "role": "Head",
                            "department": target_u.department,
                            "approvers": [target_u.name],
                            "status": "pending" if step_counter == 1 else "waiting"
                        })
                        step_counter += 1
                        existing_approvers.add(clean_name.lower())

        if len(workflow) == 0:
            raise HTTPException(status_code=400, detail="No eligible approver found for workflow.")

    # Regular users must include a department head, but selected department users may precede them.
    if not user_is_head and not is_md_user(requester) and req_dept:
        dept_heads_in_db = [u for u in all_users if is_head_user(u) and (u.department or '').strip().lower() == req_dept]
        if dept_heads_in_db and len(workflow) > 0:
            dept_head_names = [u.name.lower().strip() for u in dept_heads_in_db]
            workflow_approver_names = [
                approver.lower().strip()
                for step in workflow
                for approver in step.get("approvers", [])
            ]
            if not any(name in dept_head_names for name in workflow_approver_names):
                raise HTTPException(status_code=400, detail="The approval workflow must include your Department Head.")

    return workflow

@app.post("/api/asset-requests", status_code=201)
async def create_asset_request(request: AssetRequestCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    if caller.id != request.requestedBy and (caller.role or '').lower() != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to create a request for this user")
    from sqlalchemy.sql.expression import func
    import time
    
    workflow = build_and_validate_workflow(request, db)
    first_step = workflow[0]
    initial_status = f"Pending with {first_step['role']}"
    initial_forwarded_to = first_step["approvers"]

    max_retries = 20
    for attempt in range(max_retries):
        try:
            last_request = db.query(models.AssetRequest).filter(
                models.AssetRequest.id.like("REQ-%")
            ).order_by(
                func.length(models.AssetRequest.id).desc(),
                models.AssetRequest.id.desc()
            ).first()
            
            next_num = 1
            if last_request:
                try:
                    num_part = last_request.id.split("-")[1]
                    next_num = int(num_part) + 1
                except:
                    next_num = db.query(models.AssetRequest).count() + 1
            
            next_num += attempt
            
            while True:
                new_id = f"REQ-{next_num:04d}"
                exists = db.query(models.AssetRequest).filter(models.AssetRequest.id == new_id).first()
                if not exists:
                    break
                next_num += 1
            
            item = request.description or (request.otherAssetType if request.assetType == "Other" else request.assetType)
            if item and isinstance(item, str) and len(item) > 0:
                item = item[0].upper() + item[1:]
                
            justification = request.justification
            if justification and isinstance(justification, str) and len(justification) > 0:
                justification = justification[0].upper() + justification[1:]

            new_request = models.AssetRequest(
                id=new_id,
                item=item,
                category=request.assetType,
                amount=0,
                justification=justification,
                requestedBy=request.requestedBy,
                forwardedTo=initial_forwarded_to,
                routedTo=initial_forwarded_to,
                status=initial_status,
                handledBy=[],
                votes={},
                approverSelections={},
                commentsHistory=[],
                attachments=request.attachments or [],
                approvalSequence=workflow,
                currentStep=1,
                createdAt=datetime.now().isoformat(),
                updatedAt=datetime.now().isoformat()
            )
            
            db.add(new_request)
            db.commit()
            db.refresh(new_request)
            return {c: getattr(new_request, c) for c in new_request.__table__.columns.keys()}
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail="Could not generate unique Request ID. Please try again.")
            time.sleep(0.05)

@app.put("/api/asset-requests/{request_id}/action")
async def process_request_action(request_id: str, payload: ActionRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    if caller.id != payload.userId:
        raise HTTPException(status_code=403, detail="User ID does not match the authenticated account")
    r = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if r is None:
        raise HTTPException(status_code=404, detail="Request not found")
        
    user = caller

    # Requester cannot approve their own request
    if user.id == r.requestedBy and payload.action == 'approve':
        raise HTTPException(status_code=403, detail="Requesters cannot approve their own requests.")

    # Determine currently active approvers
    active_approver_names = []
    active_approver_ids = []
    workflow = list(r.approvalSequence) if r.approvalSequence else []
    cur_step = r.currentStep or 1
    cur_idx = cur_step - 1

    if workflow and 0 <= cur_idx < len(workflow):
        active_approver_names = workflow[cur_idx].get("approvers", [])
        active_approver_ids = workflow[cur_idx].get("approverIds", [])
    elif r.forwardedTo:
        f_list = r.forwardedTo if isinstance(r.forwardedTo, list) else [r.forwardedTo]
        active_approver_names = [
            (n.get("value") or n.get("label") or str(n)) if isinstance(n, dict) else str(n)
            for n in f_list
        ]

    # Authorization Check
    if active_approver_ids:
        is_active_approver = user.id in active_approver_ids or str(user.id) in active_approver_ids
    else:
        is_active_approver = any(
            user.name.strip().lower() == name.strip().lower()
            for name in active_approver_names
        )
    if not workflow and not is_active_approver and r.status == "Pending with MD" and is_md_user(user):
        is_active_approver = True

    if not is_active_approver:
        raise HTTPException(status_code=403, detail="Unauthorized: You are not an assigned approver for this active step.")

    handledBy = list(r.handledBy) if r.handledBy else []
    votes = dict(r.votes) if r.votes else {}
    commentsHistory = list(r.commentsHistory) if r.commentsHistory else []

    if user.id in handledBy:
        raise HTTPException(status_code=400, detail="You have already submitted your decision for this step.")

    handledBy.append(user.id)
    votes[str(user.id)] = payload.action

    newStatus = r.status
    updatedForwardedTo = r.forwardedTo
    updatedCurrentStep = cur_step

    return_target_name = None
    if payload.action == 'reject':
        newStatus = 'Rejected'
        updatedForwardedTo = None
        if workflow and 0 <= cur_idx < len(workflow):
            workflow[cur_idx]["status"] = "rejected"

    elif payload.action == 'return':
        newStatus = 'Returned'
        requester_user = db.query(models.User).filter(models.User.id == r.requestedBy).first()
        target_name = None
        if payload.selectedApprovers:
            target_name = payload.selectedApprovers[0] if isinstance(payload.selectedApprovers, list) else payload.selectedApprovers
        return_target_name = target_name or (requester_user.name if requester_user else "")

        # Check if returned to a previous step in workflow
        returned_to_step = None
        if target_name and workflow:
            for s_idx, step in enumerate(workflow):
                if s_idx < cur_idx and target_name in (step.get("approvers") or []):
                    returned_to_step = (s_idx, step)
                    break

        if returned_to_step:
            ret_idx, ret_step = returned_to_step
            updatedCurrentStep = ret_step.get("step", ret_idx + 1)
            ret_step["status"] = "pending"
            for s_idx in range(ret_idx + 1, len(workflow)):
                workflow[s_idx]["status"] = "waiting"

            # Remove handledBy & votes from ret_step onwards so they can review and vote again
            affected_users = db.query(models.User).filter(
                models.User.name.in_([target_name] + [a for s in workflow[ret_idx:] for a in (s.get("approvers") or [])])
            ).all()
            affected_ids = [u.id for u in affected_users]
            handledBy = [uid for uid in handledBy if uid not in affected_ids]
            votes = {k: v for k, v in votes.items() if int(k) not in affected_ids}

            updatedForwardedTo = ret_step.get("approvers")
            newStatus = f"Pending with {ret_step.get('role') or 'Head'}"
        else:
            updatedForwardedTo = [requester_user.name] if requester_user else None
            if workflow and 0 <= cur_idx < len(workflow):
                workflow[cur_idx]["status"] = "returned"

    elif payload.action == 'approve':
        all_users = db.query(models.User).filter(models.User.status == 'Active').all()

        step_dept = (workflow[cur_idx].get("department") or "").lower().strip() if workflow and 0 <= cur_idx < len(workflow) else ""
        step_role = (workflow[cur_idx].get("role") or "").lower().strip() if workflow and 0 <= cur_idx < len(workflow) else ""
        step_approver_id = workflow[cur_idx].get("id") or workflow[cur_idx].get("approverId") if workflow and 0 <= cur_idx < len(workflow) else None

        # Resolve legitimate user IDs of designated approvers for this active step
        step_user_ids = []
        if workflow and 0 <= cur_idx < len(workflow):
            configured_ids = workflow[cur_idx].get("approverIds", [])
            step_user_ids = [u.id for u in all_users if u.id in configured_ids or str(u.id) in configured_ids]
        if step_approver_id:
            if not step_user_ids:
                step_user_ids = [u.id for u in all_users if str(u.id) == str(step_approver_id)]

        if not step_user_ids:
            for a_name in active_approver_names:
                clean_a = str(a_name).strip().lower()
                candidates = [
                    u for u in all_users 
                    if u.name.strip().lower() == clean_a and (
                        is_head_user(u) or is_md_user(u) or
                        (step_role not in ('head', 'md') and
                         is_same_department_user_approver(u, db.query(models.User).filter(models.User.id == r.requestedBy).first()))
                    )
                ]
                if step_dept:
                    dept_matched = [u for u in candidates if (u.department or '').strip().lower() == step_dept]
                    if dept_matched:
                        candidates = dept_matched
                if step_role == 'md':
                    md_matched = [u for u in candidates if is_md_user(u)]
                    if md_matched:
                        candidates = md_matched
                step_user_ids.extend([u.id for u in candidates])

        # Step vote is completed when the authorized approver(s) have voted
        all_step_voted = all(uid in handledBy for uid in step_user_ids) if step_user_ids else True

        if all_step_voted:
            reject_count = sum(1 for uid in step_user_ids if votes.get(str(uid)) == 'reject')
            if reject_count > 0 and reject_count >= (len(step_user_ids) / 2):
                newStatus = 'Rejected'
                updatedForwardedTo = None
                if workflow and 0 <= cur_idx < len(workflow):
                    workflow[cur_idx]["status"] = "rejected"
            else:
                if workflow and 0 <= cur_idx < len(workflow):
                    workflow[cur_idx]["status"] = "approved"

                next_idx = cur_idx + 1
                if workflow and next_idx < len(workflow):
                    next_step = workflow[next_idx]
                    next_step["status"] = "pending"
                    updatedCurrentStep = next_step["step"]
                    updatedForwardedTo = next_step["approvers"]
                    handledBy = []
                    votes = {}
                    newStatus = f"Pending with {next_step.get('role') or 'Head'}"
                else:
                    newStatus = "Approved"
                    updatedForwardedTo = None
                    handledBy = []
                    votes = {}
                    if workflow:
                        for step in workflow:
                            if step.get("status") != "rejected":
                                step["status"] = "approved"

    finalComment = payload.remarks.strip() if payload.remarks and payload.remarks.strip() else "No comment provided."
    user_role_label = 'MD' if is_md_user(user) else ('Head' if is_head_user(user) else (user.role.capitalize() if user.role else 'User'))
    dept_label = f"{user.department} " if user.department else ""
    
    comment_entry = {
        "name": user.name,
        "role": f"{dept_label}{user_role_label}",
        "comment": finalComment,
        "date": datetime.now().isoformat(),
        "action": payload.action,
        "step": cur_step
    }
    if return_target_name:
        comment_entry["sentToStr"] = return_target_name
    commentsHistory.append(comment_entry)

    r.status = newStatus
    r.handledBy = handledBy
    r.votes = votes
    r.approvalSequence = workflow
    r.currentStep = updatedCurrentStep
    r.forwardedTo = updatedForwardedTo
    r.routedTo = updatedForwardedTo
    r.commentsHistory = commentsHistory
    r.updatedAt = datetime.now().isoformat()

    flag_modified(r, "approvalSequence")
    flag_modified(r, "commentsHistory")
    flag_modified(r, "handledBy")
    flag_modified(r, "votes")

    db.add(r)
    db.commit()
    db.refresh(r)
    return {c: getattr(r, c) for c in r.__table__.columns.keys()}

@app.post("/api/asset-requests/{request_id}/reply")
async def reply_to_returned_request(request_id: str, payload: ReturnReplyRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    r = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    reply_text = payload.returnReply.strip()
    if not reply_text:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    if len(reply_text) > 1000:
        raise HTTPException(status_code=400, detail="Reply must be 1000 characters or fewer.")

    comments = list(r.commentsHistory) if r.commentsHistory else []
    return_comment = next((comment for comment in reversed(comments) if comment.get("action") == "return"), None)
    if return_comment is None:
        raise HTTPException(status_code=400, detail="No return message was found")

    workflow = list(r.approvalSequence) if r.approvalSequence else []
    if not workflow:
        raise HTTPException(status_code=400, detail="No approval workflow was found")

    try:
        return_step_number = int(return_comment.get("step") or 0)
    except (TypeError, ValueError):
        return_step_number = 0
    returner_name = str(return_comment.get("name") or "").strip().lower()
    returner_step_index = next(
        (index for index, step in enumerate(workflow)
         if int(step.get("step") or index + 1) == return_step_number),
        next((index for index, step in enumerate(workflow)
              if any(str(name).strip().lower() == returner_name for name in step.get("approvers", []))), -1)
    )
    if returner_step_index < 0:
        raise HTTPException(status_code=400, detail="The approver who returned this request is not in its workflow")

    is_requester_reply = caller.id == r.requestedBy and r.status == "Returned"
    current_step_index = (r.currentStep or 1) - 1
    active_step = workflow[current_step_index] if 0 <= current_step_index < len(workflow) else {}
    active_approvers = [str(name).strip().lower() for name in active_step.get("approvers", [])]
    return_recipient = str(return_comment.get("sentToStr") or "").strip().lower()
    is_approver_reply = (
        r.status.startswith("Pending") and
        caller.name.strip().lower() == return_recipient and
        caller.name.strip().lower() in active_approvers
    )
    if not is_requester_reply and not is_approver_reply:
        raise HTTPException(status_code=403, detail="Only the requester or designated return recipient can reply")

    user_role_label = 'MD' if is_md_user(caller) else ('Head' if is_head_user(caller) else (caller.role.capitalize() if caller.role else 'User'))
    dept_label = f"{caller.department} " if caller.department else ""
    replies = list(return_comment.get("replies") or [])
    replies.append({
        "name": caller.name,
        "role": f"{dept_label}{user_role_label}",
        "comment": reply_text,
        "date": datetime.now().isoformat()
    })
    return_comment["replies"] = replies

    target_step = workflow[returner_step_index]
    current_step = int(target_step.get("step") or returner_step_index + 1)
    for index, step in enumerate(workflow):
        if index < returner_step_index:
            step["status"] = step.get("status") or "approved"
        else:
            step["status"] = "pending" if index == returner_step_index else "waiting"

    r.commentsHistory = comments
    r.approvalSequence = workflow
    r.currentStep = current_step
    r.forwardedTo = target_step["approvers"]
    r.routedTo = target_step["approvers"]
    r.status = f"Pending with {target_step.get('role') or 'Head'}"
    r.handledBy = []
    r.votes = {}
    r.updatedAt = datetime.now().isoformat()
    flag_modified(r, "commentsHistory")
    flag_modified(r, "approvalSequence")

    db.add(r)
    db.commit()
    db.refresh(r)
    return {column: getattr(r, column) for column in r.__table__.columns.keys()}

@app.put("/api/asset-requests/{request_id}")
async def update_asset_request(request_id: str, request: AssetRequestCreate, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    r = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if caller.id != r.requestedBy and (caller.role or '').lower() != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to edit this request")
    if request.requestedBy != r.requestedBy:
        raise HTTPException(status_code=400, detail="The requester cannot be changed")

    was_returned = r.status == "Returned"
        
    workflow = build_and_validate_workflow(request, db)
    previous_workflow = list(r.approvalSequence) if r.approvalSequence else []
    comments = list(r.commentsHistory) if r.commentsHistory else []
    requester = db.query(models.User).filter(models.User.id == request.requestedBy).first()
    reply_text = (request.returnReply or "").strip()
    return_comment = None
    target_step_index = 0
    if was_returned and caller.id == r.requestedBy and reply_text:
        if len(reply_text) > 1000:
            raise HTTPException(status_code=400, detail="Reply must be 1000 characters or fewer.")
        return_comment = next((comment for comment in reversed(comments) if comment.get("action") == "return"), None)
        if return_comment is not None:
            try:
                return_step_number = int(return_comment.get("step") or 0)
            except (TypeError, ValueError):
                return_step_number = 0
            target_step_index = next(
                (index for index, step in enumerate(workflow)
                 if int(step.get("step") or index + 1) == return_step_number),
                next((index for index, step in enumerate(workflow)
                      if any(str(name).strip().lower() == str(return_comment.get("name") or "").strip().lower()
                             for name in step.get("approvers", []))), 0)
            )

    target_step = workflow[target_step_index]
    current_step = int(target_step.get("step") or target_step_index + 1)
    initial_status = f"Pending with {target_step['role']}"
    for index, step in enumerate(workflow):
        if index < target_step_index and was_returned and reply_text:
            previous_status = previous_workflow[index].get("status") if index < len(previous_workflow) else None
            step["status"] = previous_status if previous_status in ("approved", "rejected", "returned") else "approved"
        else:
            step["status"] = "pending" if index == target_step_index else "waiting"

    item = request.description or (request.otherAssetType if request.assetType == "Other" else request.assetType)
    if item and isinstance(item, str) and len(item) > 0:
        item = item[0].upper() + item[1:]
        
    justification = request.justification
    if justification and isinstance(justification, str) and len(justification) > 0:
        justification = justification[0].upper() + justification[1:]
        
    r.item = item
    r.category = request.assetType
    r.justification = justification
    r.forwardedTo = target_step["approvers"]
    r.routedTo = target_step["approvers"]
    r.approvalSequence = workflow
    r.currentStep = current_step
    r.status = initial_status
    r.attachments = request.attachments or r.attachments
    r.handledBy = []
    r.votes = {}
    r.approverSelections = {}
    
    if was_returned and caller.id == r.requestedBy and reply_text:
        if return_comment is not None:
            replies = list(return_comment.get("replies") or [])
            user_role_label = 'MD' if is_md_user(caller) else ('Head' if is_head_user(caller) else (caller.role.capitalize() if caller.role else 'User'))
            dept_label = f"{caller.department} " if caller.department else ""
            replies.append({
                "name": caller.name,
                "role": f"{dept_label}{user_role_label}",
                "comment": reply_text,
                "date": datetime.now().isoformat()
            })
            return_comment["replies"] = replies
    comments.append({
        "name": requester.name if requester else "Requester",
        "role": requester.role.capitalize() if requester and requester.role else "User",
        "comment": "Request edited and resubmitted.",
        "date": datetime.now().isoformat(),
        "action": "edit",
        "step": current_step
    })
    r.commentsHistory = comments
    r.updatedAt = datetime.now().isoformat()
    
    db.add(r)
    db.commit()
    db.refresh(r)
    return {c: getattr(r, c) for c in r.__table__.columns.keys()}

@app.delete("/api/asset-requests/{request_id}")
async def delete_asset_request(request_id: str, authorization: str = Header(None), db: Session = Depends(get_db)):
    caller = get_caller(authorization, db)
    r = db.query(models.AssetRequest).filter(models.AssetRequest.id == request_id).first()
    if r:
        if caller.id != r.requestedBy and (caller.role or '').lower() != 'admin':
            raise HTTPException(status_code=403, detail="Not authorized to delete this request")
        db.delete(r)
        db.commit()
    return {"message": "Deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
