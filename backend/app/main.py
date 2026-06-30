from fastapi import FastAPI

app = FastAPI(title="LatePlate API")

@app.get("/health")
def health_check():
    return {"status": "ok"}