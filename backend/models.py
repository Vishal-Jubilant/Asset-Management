from sqlalchemy import Column, Integer, String, Boolean, JSON, ForeignKey
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    mailid = Column(String, unique=True, index=True)
    empCode = Column(String)
    mobile = Column(String)
    role = Column(String)
    department = Column(String)
    password = Column(String)
    status = Column(String)
    firstLogin = Column(Boolean, default=True)
    reportingTo = Column(String, nullable=True)
    reportingRole = Column(String, nullable=True)
    securityQuestions = Column(JSON, nullable=True)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    level = Column(Integer)

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True)
    label = Column(String)

class AssetRequest(Base):
    __tablename__ = "asset_requests"
    id = Column(String, primary_key=True, index=True)
    item = Column(String)
    category = Column(String)
    amount = Column(Integer, default=0)
    justification = Column(String)
    requestedBy = Column(Integer, ForeignKey("users.id"))
    forwardedTo = Column(JSON, nullable=True)
    routedTo = Column(JSON, nullable=True)
    status = Column(String)
    handledBy = Column(JSON, default=list)
    votes = Column(JSON, default=dict)
    approverSelections = Column(JSON, default=dict)
    commentsHistory = Column(JSON, default=list)
    attachments = Column(JSON, default=list)
    createdAt = Column(String)
    updatedAt = Column(String)
