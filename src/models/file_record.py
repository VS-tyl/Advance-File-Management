from sqlalchemy import Column, String, DateTime, LargeBinary, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
import uuid
from datetime import datetime
from src.database import Base

class FileRecord(Base):
    __tablename__ = "files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_name = Column(String, nullable=False)
    file_type_id = Column(UUID(as_uuid=True), ForeignKey("file_types.id"), nullable=False)
    file_data = Column(LargeBinary, nullable=False)  
    file_metadata = Column(JSONB, nullable=True)  
    uploaded_at = Column(DateTime, default=datetime.now)
    folder_path = Column(String, nullable=True)  
    file_type = relationship("FileType")


class FileType(Base):
    __tablename__ = "file_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_type = Column(String, unique=True, nullable=False)
    metadata_schema = Column(JSONB, nullable=False)

class FileEmbedding(Base):
    __tablename__ = "file_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(UUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"))
    chunk_index = Column(Integer)
    chunk_text = Column(Text)
    embedding = Column(Vector(768)) 