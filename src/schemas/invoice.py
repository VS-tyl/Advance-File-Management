from pydantic import BaseModel

class Invoice(BaseModel):
    budget: str
    tags: list
    description: str
    title: str
    invoice_number: str
    amount_due: float
    status: str