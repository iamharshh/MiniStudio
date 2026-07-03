# MiniStudio AI 

MiniStudio AI is an asynchronous, cloud-orchestrated multimodal storyboard generation pipeline. Users can input a high-level movie or story concept, choose their desired frame count, and the system automatically orchestrates a complete visual script and paints high-fidelity cinematic frames using a fully distributed, keyless-optimized free-tier AI architecture.

---

## Features

* **Asynchronous Processing:** Leverages FastAPI's native `BackgroundTasks` orchestration worker thread pool to prevent system lockups during deep image computation blocks.
* **Structured JSON Scripting:** Utilizes strict Pydantic parsing schemas to enforce clean structured data extraction directly from the LLM logic layer.
* **High-Fidelity Diffusion Stack:** Features direct integration with serverless clusters to render visual frames concurrently without local GPU dependencies.
* **Long-Polling Core Architecture:** Designed with a decoupled frontend-backend model architecture, connecting through a memory-cached status loop.

---

##  System Architecture

MiniStudio AI operates on a completely decoupled, client-server layout:

1.  **Frontend Node (Next.js):** Acts as the presentation interface workspace, sending requests asynchronously via HTTP REST endpoints and long-polling the memory state.
2.  **Backend Broker (FastAPI):** Recovers client configurations, returns instant `202 Queued` job tokens, and hands heavy computation jobs off to decoupled system background threads.
3.  **Orchestration Engine (Gemini 2.5 Flash):** Generates structural text scripts mapping out visual prompts and sequential narrative data strings cleanly matching strict Pydantic structures.
4.  **Media Generation Cluster (FLUX.1-schnell via Hugging Face SDK):** Intercepts visual prompts, executes rapid low-latency step-diffusion passes over active serverless routers, and streams binary byte arrays back to in-memory application databases (`BytesIO`).

---

##  Technology Stack

* **Frontend:** Next.js, React, Tailwind CSS
* **Backend Framework:** FastAPI, Uvicorn, Python 3.10+
* **Data Serialization:** Pydantic v2
* **Image Processing:** Pillow (PIL), HTTPX
* **AI SDK Clients:** `google-genai` (Gemini 2.5 Flash), `huggingface_hub` (InferenceClient)
* **Core Image Model:** `black-forest-labs/FLUX.1-schnell`

---

##  Quick Start & Installation

1. Environment Setup
Clone the repository and create a `.env` file inside your backend workspace root directory:

GEMINI_API_KEY=your_google_ai_studio_api_key
HF_TOKEN=your_huggingface_developer_access_token


2. Backend Installation & Boot
Ensure your virtual environment is active, install the dependencies, and run the FastAPI server:

- Install core requirements
pip install fastapi uvicorn google-genai huggingface_hub Pillow pydantic python-dotenv httpx

- Boot the local application broker
uvicorn main:app --reload
The server will boot up and expose its active API routes natively on http://localhost:8000.


3. Frontend Installation & Boot
Navigate to your frontend directory, install your node modules, and launch your Next.js local development workspace:

Bash
npm install
npm run dev
Open http://localhost:3000 inside your browser to start generating your storyboards.