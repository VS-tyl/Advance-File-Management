from ..interface.validation_interface import BaseValidator

class BoolValidator(BaseValidator):
    def validate(self, value):
        v = value.lower() if isinstance(value, str) else value
        if v == "true":
            return True
        elif v == "false":
            return False
        else:
            raise ValueError("Value is not a boolean.")