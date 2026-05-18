# Implement the chunking method interface from /src/interface/chunking_methods.py and implement the chunk method to chunk text by each row in excel file or any tabular file form.
from src.interface.chunking_methods import ChunkingMethod
class ChunkByRows(ChunkingMethod):

    def chunk(self, text: str) -> list[str]:
        # Split the text into rows using newline character
        rows = text.split("\n")
        return rows
