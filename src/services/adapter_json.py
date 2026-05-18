# implement the adapter extension class from /src/interface/adapter_extension.py and implement the get_adapter method to extract/parse/read the text from json files

import json
from src.interface.adapter_extension import AdapterExtensionInterface
class AdapterJson(AdapterExtensionInterface):

    def extract_text(self, raw_data: bytes) -> str:
        try:
            return json.dumps(json.loads(raw_data.decode("utf-8")))
        except Exception as e:
            return ""