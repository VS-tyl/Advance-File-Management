from ..interface.validation_interface import BaseValidator

class StrValidator(BaseValidator):

    @staticmethod
    def is_numeric(v):
        try:
            float(v)
            return True
        except ValueError:
            return False
        
    def validate(self, value):
        if self.is_numeric(value):
            raise ValueError("String value cannot be numeric.")
        if isinstance(value, str) and value.lower() in ["true", "false"]:
            raise ValueError("String value cannot be a boolean.")
        if not isinstance(value, str):
            raise ValueError("Value is not a string.")
        return value