# Adapter service to get the required adapter for the file extension
from src.services.adapter_docx import AdapterDocx
from src.services.adapter_json import AdapterJson
from src.services.adapter_text import AdapterText
from src.services.adapter_pdf import AdapterPdf
from src.services.adapter_xlsx import AdapterXlsx
class AdapterParsingService:
    adapters = {
        ".docx": AdapterDocx(),
        ".doc": AdapterDocx(),
        ".json": AdapterJson(),
        ".txt": AdapterText(),
        ".pdf": AdapterPdf(),
        ".xlsx": AdapterXlsx(),
    }

    @staticmethod
    def get_adapter(file_extension: str, raw_data: bytes):
        adapter_node = AdapterParsingService.adapters.get(file_extension.lower())
        if adapter_node:
            return adapter_node.extract_text(raw_data)
        else:
            raise ValueError(f"No adapter found for file extension: {file_extension}")
