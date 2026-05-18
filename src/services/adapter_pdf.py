# implement the adapter extension class from /src/interface/adapter_extension.py and implement the get_adapter method to extract/parse/read the text from pdf files
import io
from PyPDF2 import PdfReader
from src.interface.adapter_extension import AdapterExtensionInterface

class AdapterPdf(AdapterExtensionInterface):
    def extract_text(self, raw_data: bytes) -> str:
        try:
            reader = PdfReader(io.BytesIO(raw_data))
            full_text = []
            for page in reader.pages:
                full_text.append(page.extract_text())
            return "\n".join(full_text)
        except Exception as e:
            return ""
