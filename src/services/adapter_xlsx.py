# implement the adapter extension class from /src/interface/adapter_extension.py and implement the get_adapter method to extract/parse/read the text from excel or tabular format files
import io
import pandas as pd
from src.interface.adapter_extension import AdapterExtensionInterface
class AdapterXlsx(AdapterExtensionInterface):

    def extract_text(self, raw_data: bytes) -> str:
        try:
            excel_data = pd.read_excel(io.BytesIO(raw_data), sheet_name=None)
            full_text = []
            for sheet_name, df in excel_data.items():
                full_text.append(f"Sheet: {sheet_name}")
                for index, row in df.iterrows():
                    row_text = ", ".join([str(item) for item in row.tolist()])
                    full_text.append(row_text)
            return "\n".join(full_text)
        except Exception as e:
            return "Error parsing Excel file."
