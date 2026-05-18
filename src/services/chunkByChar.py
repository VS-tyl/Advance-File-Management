# Implement the chunking method interface from /src/interface/chunking_methods.py and implement the chunk method to chunk text by custom chunk size in number of characters and overlap
from src.interface.chunking_methods import ChunkingMethod
class ChunkByChar(ChunkingMethod):

    def __init__(self, chunk_size: int = 100, overlap: int = 20):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, text: str) -> list[str]:
        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = min(start + self.chunk_size, text_length)
            chunks.append(text[start:end])
            start += self.chunk_size - self.overlap

        return chunks
