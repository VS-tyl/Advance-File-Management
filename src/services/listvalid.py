from ..interface.validation_interface import BaseValidator

class ListValidator(BaseValidator):
    def validate(self, value):
        import json
        try:
            val = json.loads(value)
            if isinstance(val, list):
                return val
            else:
                raise ValueError("Value is not a list.")
        except Exception:
            if isinstance(value, str):
                return [item.strip() for item in value.split(",")]
            raise ValueError("Value is not a list.")