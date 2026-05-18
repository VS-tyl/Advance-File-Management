from ..interface.validation_interface import BaseValidator

class DatetimeValidator(BaseValidator):
    def validate(self, value):
        try:
            from datetime import datetime
            return str(datetime.fromisoformat(value))
        except Exception:
            raise ValueError("Value is not a valid datetime.")