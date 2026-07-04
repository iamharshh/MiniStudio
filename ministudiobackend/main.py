import os
import asyncio
import time
import io
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv()

# Official SDK clients initialized natively
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
hf_client = InferenceClient(api_key=HF_TOKEN) if HF_TOKEN else None

app = FastAPI(title="MiniStudio Multimodal Pipeline - Core Production Stack")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS_DB = {}

class Scene(BaseModel):
    scene_number: int
    visual_description: str
    narration: str

class StoryboardLayout(BaseModel):
    title: str
    scenes: List[Scene]

class StoryRequest(BaseModel):
    prompt: str
    num_scenes: Optional[int] = 3

# --- Image Generation Layer (Hugging Face SDK Client) ---
async def generate_hf_image(prompt: str) -> bytes:
    loop = asyncio.get_running_loop()
    
    def call_inference_api():
        image = hf_client.text_to_image(
            prompt=prompt,
            model="black-forest-labs/FLUX.1-schnell"
        )
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        return buffer.getvalue()

    return await loop.run_in_executor(None, call_inference_api)

@app.get("/")
def home_verification():
    return {"status": "MiniStudio Production API Online", "framework": "FastAPI on Vercel"}

@app.get("/healthz")
def health_check():
    return {"status": "ok"}

# --- AI Core Pipeline Loop ---
async def ai_generation_pipeline(job_id: str, prompt: str, num_scenes: int):
    try:
        if client is None:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        if hf_client is None:
            raise RuntimeError("HF_TOKEN is not configured")

        JOBS_DB[job_id]["status"] = "orchestrating"
        print(f"[{job_id}] Waking up Gemini Director Agent...")

        clean_prompt = f"Break down this story concept into exactly {num_scenes} sequential visual storyboard scenes: {prompt}"
        loop = asyncio.get_running_loop()
        
        def call_gemini():
            return client.models.generate_content(
                # UPDATED: Changed model to exactly match your verified active key quota
                model='gemini-2.5-flash',
                contents=clean_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=StoryboardLayout,
                    temperature=0.1
                )
            )

        response = await loop.run_in_executor(None, call_gemini)
        storyboard = StoryboardLayout.model_validate_json(response.text)
        JOBS_DB[job_id]["storyboard"] = storyboard.model_dump()
        print(f"[{job_id}] Script built successfully: {storyboard.title}")

        JOBS_DB[job_id]["status"] = "generating_images"
        
        for scene in storyboard.scenes:
            print(f"[{job_id}] Requesting SDK Asset Frame for Scene {scene.scene_number}/{num_scenes}...")
            
            img_bytes = await generate_hf_image(scene.visual_description)
            JOBS_DB[job_id][f"img_bytes_{scene.scene_number}"] = img_bytes
            
            JOBS_DB[job_id]["results"].append({
                "scene_number": scene.scene_number,
                "visual_prompt_used": scene.visual_description,
                "image_url": f"/api/jobs/{job_id}/image/{scene.scene_number}",
                "narration": scene.narration
            })
            
        JOBS_DB[job_id]["status"] = "completed"
        print(f"[{job_id}] Multimodal pipeline compilation successful!")

    except Exception as e:
        JOBS_DB[job_id]["status"] = f"failed: {str(e)}"
        print(f"[{job_id}] Pipeline Exception: {str(e)}")

# --- Endpoints ---

@app.post("/api/generate", status_code=202)
def start_generation(request: StoryRequest, background_tasks: BackgroundTasks):
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    job_id = f"job_{int(time.time())}"
    JOBS_DB[job_id] = {"status": "queued", "storyboard": None, "results": []}
    
    background_tasks.add_task(ai_generation_pipeline, job_id, request.prompt, request.num_scenes)
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/status/{job_id}")
def get_status(job_id: str):
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job entry not found")
    return {k: v for k, v in JOBS_DB[job_id].items() if not k.startswith("img_bytes_")}

@app.get("/api/jobs/{job_id}/image/{scene_num}")
def get_job_image(job_id: str, scene_num: int):
    byte_key = f"img_bytes_{scene_num}"
    if job_id not in JOBS_DB or byte_key not in JOBS_DB[job_id]:
        raise HTTPException(status_code=404, detail="Image data missing")
    
    return Response(content=JOBS_DB[job_id][byte_key], media_type="image/jpeg")