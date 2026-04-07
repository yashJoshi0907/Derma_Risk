# Derma_Risk (SkinScan AI)

This project was made at Hacksagon at ABV-IIITM.

## Overview

Derma_Risk (SkinScan AI) is an AI-powered diagnostic and educational tool for skin lesions. It utilizes a deep learning backend (FastAPI) combined with a modern frontend interface to analyze skin lesion images. The platform supports predicting various skin conditions (such as Melanoma, Basal Cell Carcinoma, and Nevi), offering explainable AI visual overlays (Grad-CAM and LIME) to help users understand the model's focus, and provides a built-in interactive chatbot powered by Google Gemini to answer questions regarding daily skin health.

---

## Environment Variables

You will need to configure environment variables for both the backend and frontend. Create `.env` files in their respective directories using the variables listed below.

### Backend (`/.env`)
Create a `.env` file in the root directory relative to `app.py`.
```env
GEMINI_API_KEY=your api key 
MONGODB_URI= your mongo db link (srv)
MONGODB_DB_NAME= your cluster name 
SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GOOGLE_CLIENT_ID=your api key
```

### Frontend (`/frontend/.env`)
Create a `.env` file in the `frontend` folder.
```env
# Leave empty so Vite proxy routes /auth, /predict, etc. to localhost:8000
# Only set this for production builds: VITE_API_URL=https://your-backend.com
VITE_API_URL=
VITE_GOOGLE_CLIENT_ID=your api key
```

*(Note for maintainer: Please manually replace the placeholder values and add any other required variables above)*

---

## Models

Due to size limitations, the trained deep learning models are not included directly in the repository. 

1. **Download the models here:** `https://drive.google.com/drive/folders/1GRwFFCjwPhs3DwTCKaE9vHyqU2ko8yxc?usp=drive_link`
2. **Install them:** Once downloaded, extract the model files and place them inside the `models/` directory in the root of the project. 

It should look something like this:
```text
/models
  ├── densenet121_skin_classifier.h5
  ├── cnn_model.keras  (if applicable)
  └── ...
```

---

## How to Run

Follow these exact steps to start both the backend server and the frontend client.

### 1. Start the Backend Server

Open a terminal in the root directory of the project.

```bash
# Optional: Create and activate a virtual environment
python -m venv .venv
source .venv/Scripts/activate  # On Windows, use `.venv\Scripts\activate`

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI server using Uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```
The backend should now be running at `http://localhost:8001`.

### 2. Start the Frontend App

Open a new terminal window and navigate into the `frontend` directory.

```bash
# Navigate to the frontend directly
cd frontend

# Install fronted dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend should now be running at `http://localhost:5173` (or the port specified in your console). Open this URL in your browser to use the application.

If ports are already in use, run the frontend on port 5174.
