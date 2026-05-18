# Abstract class to define chunking methods
from abc import ABC, abstractmethod

class ChunkingMethod(ABC):

    @abstractmethod
    def chunk(self, text: str) -> list[str]:
        pass