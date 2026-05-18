from ..interface.validation_interface import BaseValidator

class FloatValidator(BaseValidator):
    def validate(self, value):
        try:
            return float(value)
        except Exception:
            raise ValueError("Value is not a float.")