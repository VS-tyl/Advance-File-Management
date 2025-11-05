from ..interface.validation_interface import BaseValidator

class IntValidator(BaseValidator):
    def validate(self, value):
        try:
            return int(value)
        except Exception:
            raise ValueError("Value is not an integer.")