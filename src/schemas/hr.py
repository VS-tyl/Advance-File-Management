from pydantic import BaseModel

class HR(BaseModel):
    document_id: str
    budget: str
    tags: list
    description: str
    title: str



    