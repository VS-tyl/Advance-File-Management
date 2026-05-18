# chunking service class to select the chunking method based on user input and chunk the text accordingly, like factory or adapter method
from src.interface.chunking_methods import ChunkingMethod
from src.services.chunkByChar import ChunkByChar
from src.services.chunkBySentences import ChunkBySentences
from src.services.chunkByRows import ChunkByRows
from src.services.chunkBySemantics import ChunkBySemantics
class ChunkingService:

    chunkers = {
        "char": ChunkByChar(),
        "sentences": ChunkBySentences(),
        "rows": ChunkByRows(),
        "semantics": ChunkBySemantics()
    }

    @staticmethod
    def get_chunker(method: str, text: str) -> list[str]:
        chunker = ChunkingService.chunkers.get(method, ChunkByChar())
        if chunker:
            return chunker.chunk(text)
        raise ValueError(f"Unsupported chunking method: {method}")