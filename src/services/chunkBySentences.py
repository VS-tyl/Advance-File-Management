# Implement the chunking method interface from /src/interface/chunking_methods.py and implement the chunk method to chunk text by sentences(. fullstops)
import re
from src.interface.chunking_methods import ChunkingMethod

class ChunkBySentences(ChunkingMethod):

    def chunk(self, text: str) -> list[str]:
        # Split the text into sentences using a regular expression
        sentences = re.split(r'(?<=[.!?]) +', text)
        return sentences
