from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    raghive_host: str = "0.0.0.0"
    raghive_port: int = 8000
    raghive_cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    raghive_mode: Literal["lite", "full"] = "lite"
    raghive_allow_heuristic_llm: bool = True

    local_inference_url: str = "http://localhost:8001/v1"
    local_api_key: str = "LOCAL_API_KEY"
    gen_model_name: str = "Qwen/Qwen2.5-32B-Instruct"
    xai_model_name: str = "Qwen/Qwen2.5-0.5B-Instruct"

    embedding_model: str = "BAAI/bge-m3"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    chroma_path: str = str(ROOT_DIR / "data" / "chroma")
    chroma_collection: str = "raghive_chunks"
    seed_on_startup: bool = True

    auth_disabled: bool = True
    firebase_project_id: str = ""
    firebase_credentials_file: str = ""
    mock_bearer_token: str = "mock_firebase_id_token_raghive_bearer_12345"

    database_url: str = f"sqlite:///{(ROOT_DIR / 'data' / 'raghive.db').as_posix()}"
    upload_dir: str = str(ROOT_DIR / "data" / "uploads")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.raghive_cors_origins.split(",") if o.strip()]

    @property
    def is_full_mode(self) -> bool:
        return self.raghive_mode == "full"


@lru_cache
def get_settings() -> Settings:
    return Settings()
