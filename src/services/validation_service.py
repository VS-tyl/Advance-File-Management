from .boolvalid import BoolValidator
from .datetimevalid import DatetimeValidator
from .floatvalid import FloatValidator
from .intvalid import IntValidator
from .listvalid import ListValidator
from .strvalid import StrValidator

class ValidationService:
    VALIDATOR_REGISTRY = {
        "str": StrValidator(),
        "int": IntValidator(),
        "float": FloatValidator(),
        "bool": BoolValidator(),
        "datetime": DatetimeValidator(),
        "list": ListValidator(),
    }


    @staticmethod
    def check_type(field_type: str, value: str):
        validator = ValidationService.VALIDATOR_REGISTRY.get(field_type)
        if not validator:
            raise ValueError(f"Unsupported field type: {field_type}")
        return validator.validate(value)