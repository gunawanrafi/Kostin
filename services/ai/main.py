from contextlib import asynccontextmanager
from typing import AsyncIterator
import os
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield


app = FastAPI(
    title="KostIn AI Service",
    version="0.0.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthData(BaseModel):
    status: str


class ApiResponse(BaseModel):
    data: HealthData | None
    error: dict | None
    meta: dict


@app.get("/health", response_model=ApiResponse)
async def health() -> ApiResponse:
    return ApiResponse(
        data=HealthData(status="ok"),
        error=None,
        meta={"requestId": str(uuid.uuid4())},
    )
