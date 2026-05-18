from ..interface.validation_interface import BaseValidator

class ListValidator(BaseValidator):
    def validate(self, value):
        if isinstance(value, list):
            return value
        import json
        try:
            val = json.loads(value)
            if isinstance(val, list):
                return val
            raise ValueError("Value is not a list.")
        except (json.JSONDecodeError, TypeError):
            if isinstance(value, str):
                return [item.strip() for item in value.split(",") if item.strip()]
            raise ValueError("Value is not a list.")