# Implement the chunking method interface from /src/interface/chunking_methods.py and implement the chunk method to chunk text by meaning f the sentences using semchunk library
from src.interface.chunking_methods import ChunkingMethod
import semchunk 
class ChunkBySemantics(ChunkingMethod):

    def chunk(self, text: str) -> list[str]:
        # Use semchunk to chunk text by semantics
        chunker = semchunk.chunkerify('isaacus/kanon-tokenizer', 20)
        chunks = chunker(text)
        return chunks
