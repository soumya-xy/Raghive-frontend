"""Re-index all documents and seed corpus with neural embeddings."""
from pathlib import Path
from app.config import get_settings
from app.services.vectorstore import get_collection, upsert_chunks
from app.services.seed_corpus import SEED_DOCUMENTS
from app.services.ingest import ingest_file

def reindex_all():
    print("Connecting to Chroma...")
    col = get_collection()
    import chromadb
    settings = get_settings()
    client = chromadb.PersistentClient(path=settings.chroma_path)
    
    print("Clearing old hash embeddings from collection...")
    try:
        client.delete_collection(settings.chroma_collection)
    except Exception as e:
        print("Delete collection notice:", e)
    
    # Re-get collection
    col = client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
        embedding_function=None,
    )
    
    # Global collection reset in module
    import app.services.vectorstore as vs
    vs._collection = col
    vs._chroma_client = client

    print("Re-indexing seed corpus with SentenceTransformer...")
    seed_chunks = []
    for i, doc in enumerate(SEED_DOCUMENTS, start=1):
        seed_chunks.append(
            {
                "id": vs.chunk_id(doc["source"], i, doc["text"]),
                "source": doc["source"],
                "page": i,
                "text": doc["text"],
            }
        )
    n_seed = upsert_chunks(seed_chunks)
    print(f"Seeded {n_seed} chunks.")

    # Re-ingest uploaded files
    upload_dir = Path(settings.upload_dir)
    if upload_dir.exists():
        for f in upload_dir.iterdir():
            if f.is_file() and not f.name.startswith("."):
                print(f"Re-ingesting upload: {f.name} ({f.stat().st_size} bytes)...")
                data = f.read_bytes()
                n = ingest_file(f.name, data)
                print(f"Ingested {n} chunks from {f.name}.")

    print("Re-indexing complete! Total chunks in Chroma:", col.count())

if __name__ == "__main__":
    reindex_all()

