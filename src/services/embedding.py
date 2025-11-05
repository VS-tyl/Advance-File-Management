import io, csv, json
import time
import google.generativeai as genai
from langchain_text_splitters import RecursiveCharacterTextSplitter


genai.configure(api_key="gemini-api-key")

def extract_text(file_name: str, raw_data: bytes) -> str:
    try:
        if file_name.endswith(".txt"):
            return raw_data.decode("utf-8")
        elif file_name.endswith(".json"):
            return json.dumps(json.loads(raw_data.decode("utf-8")))
        elif file_name.endswith(".csv"):
            reader = csv.reader(io.StringIO(raw_data.decode("utf-8")))
            return "\n".join([", ".join(row) for row in reader])
        else:
            return ""
    except Exception:
        return ""

def chunk_text(text: str):
    splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=10)
    return splitter.split_text(text)

def get_embeddings(chunks: list[str]) -> list[list[float]]:
    embeddings = []
    for chunk in chunks:
        resp = genai.embed_content(
            model="gemini-embedding-001",
            content=chunk,
            output_dimensionality=768
        )
        embeddings.append(resp["embedding"])
    return embeddings
