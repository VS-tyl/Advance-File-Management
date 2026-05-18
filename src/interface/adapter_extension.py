# abstract class interface for adapter factory pattern to get the required adapter for the file extension
from abc import ABC, abstractmethod

class AdapterExtensionInterface(ABC):
    @abstractmethod
    def extract_text(self, raw_data: bytes) -> str:
        pass